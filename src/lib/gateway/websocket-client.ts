import type { GatewayConfig, GatewayFrame, GatewayEvent, GatewayResponse, ConnectionStatus, ResponseFrame, EventFrame } from '@/types/gateway';
import { createConnectFrame, createRequestFrame, parseFrame, isResponseFrame, isEventFrame } from './protocol';

type EventHandler = (event: GatewayEvent) => void;
type StatusHandler = (status: ConnectionStatus) => void;

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
  private connectPayloadHandlers = new Set<(payload: Record<string, unknown>) => void>();
  private connectFrameId: string | null = null;

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

  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getMaxReconnectAttempts(): number {
    return this.config.maxReconnectAttempts;
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
        this.sendConnectRequest();
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

  onConnectPayload(handler: (payload: Record<string, unknown>) => void): () => void {
    this.connectPayloadHandlers.add(handler);
    return () => this.connectPayloadHandlers.delete(handler);
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

  private sendConnectRequest(): void {
    const frame = createConnectFrame(this.config.token);
    this.connectFrameId = frame.id;
    this.send(frame);
  }

  private handleFrame(frame: GatewayFrame): void {
    if (isResponseFrame(frame)) {
      this.handleResponse(frame);
    } else if (isEventFrame(frame)) {
      this.handleEvent(frame);
    }
  }

  private handleResponse(frame: ResponseFrame): void {
    // Check if this is the connect handshake response
    if (this.connectFrameId && frame.id === this.connectFrameId) {
      this.connectFrameId = null;
      if (frame.ok) {
        this.setStatus('connected');
        this.startPingInterval();
        // Emit the full connect response payload (contains snapshot, server, policy)
        if (frame.payload) {
          this.connectPayloadHandlers.forEach((h) => h(frame.payload as Record<string, unknown>));
        }
      } else {
        console.error('[gateway] connect rejected:', frame.error?.message || 'unknown error');
        this.setStatus('error');
        this.disconnect();
      }
      return;
    }

    // Regular request/response handling
    const pending = this.pendingRequests.get(frame.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(frame.id);
      if (frame.ok) {
        pending.resolve({ id: frame.id, result: frame.payload });
      } else {
        pending.reject(new Error(frame.error?.message || 'Unknown error'));
      }
    }
  }

  private handleEvent(frame: EventFrame): void {
    // Skip internal protocol events
    if (frame.event === 'connect.challenge') {
      return;
    }

    // Convert gateway EventFrame to our GatewayEvent format for the store
    const gatewayEvent: GatewayEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: frame.event as GatewayEvent['type'],
      timestamp: Date.now(),
      sessionId: (frame.payload?.sessionId as string) || undefined,
      agentId: (frame.payload?.agentId as string) || undefined,
      data: (frame.payload as Record<string, unknown>) || {},
    };

    this.eventHandlers.forEach((handler) => handler(gatewayEvent));
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
    // OpenClaw uses tick-based keep-alive; send a lightweight req
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send(createRequestFrame('ping'));
      }
    }, 15000);
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
    this.connectFrameId = null;
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
