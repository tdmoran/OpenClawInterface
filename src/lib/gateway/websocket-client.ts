import type { GatewayConfig, GatewayFrame, GatewayEvent, GatewayResponse, ConnectionStatus } from '@/types/gateway';
import { createAuthFrame, createPingFrame, createRequestFrame, parseFrame } from './protocol';

type EventHandler = (event: GatewayEvent) => void;
type StatusHandler = (status: ConnectionStatus) => void;
type ResponseHandler = (response: GatewayResponse) => void;

interface PendingRequest {
  resolve: (response: GatewayResponse) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class GatewayClient {
  private static instance: GatewayClient | null = null;
  private ws: WebSocket | null = null;
  private config: GatewayConfig;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private eventHandlers = new Set<EventHandler>();
  private statusHandlers = new Set<StatusHandler>();

  private constructor(config: GatewayConfig) {
    this.config = config;
  }

  static getInstance(config?: GatewayConfig): GatewayClient {
    if (!GatewayClient.instance) {
      GatewayClient.instance = new GatewayClient(
        config || {
          url: 'ws://localhost:18789',
          reconnectInterval: 3000,
          maxReconnectAttempts: 10,
        }
      );
    }
    if (config) {
      GatewayClient.instance.config = config;
    }
    return GatewayClient.instance;
  }

  static resetInstance(): void {
    if (GatewayClient.instance) {
      GatewayClient.instance.disconnect();
      GatewayClient.instance = null;
    }
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.authenticate();
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        const frame = parseFrame(event.data as string);
        if (frame) {
          this.handleFrame(frame);
        }
      };

      this.ws.onclose = () => {
        this.cleanup();
        if (this.status !== 'disconnected') {
          this.setStatus('reconnecting');
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.setStatus('error');
      };
    } catch {
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.setStatus('disconnected');
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  async request(method: string, params?: Record<string, unknown>): Promise<GatewayResponse> {
    return new Promise((resolve, reject) => {
      if (this.status !== 'connected') {
        reject(new Error('Not connected to gateway'));
        return;
      }

      const frame = createRequestFrame(method, params);
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(frame.id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      this.pendingRequests.set(frame.id, { resolve, reject, timeout });
      this.send(frame);
    });
  }

  private authenticate(): void {
    const frame = createAuthFrame(this.config.token);
    this.send(frame);
  }

  private handleFrame(frame: GatewayFrame): void {
    switch (frame.type) {
      case 'auth_ok':
        this.setStatus('connected');
        break;

      case 'auth_error':
        this.setStatus('error');
        this.disconnect();
        break;

      case 'event':
        this.handleEvent(frame.payload as GatewayEvent);
        break;

      case 'response': {
        const response = frame.payload as GatewayResponse;
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.id);
          pending.resolve(response);
        }
        break;
      }

      case 'error': {
        const errorResponse = frame.payload as GatewayResponse;
        const pendingErr = this.pendingRequests.get(errorResponse.id);
        if (pendingErr) {
          clearTimeout(pendingErr.timeout);
          this.pendingRequests.delete(errorResponse.id);
          pendingErr.reject(new Error(errorResponse.error?.message || 'Unknown error'));
        }
        break;
      }

      case 'pong':
        break;
    }
  }

  private handleEvent(event: GatewayEvent): void {
    this.eventHandlers.forEach((handler) => handler(event));
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }

  private send(frame: GatewayFrame): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame));
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send(createPingFrame());
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setStatus('error');
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, this.config.reconnectInterval);
  }

  private cleanup(): void {
    this.stopPingInterval();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
  }
}
