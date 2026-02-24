import type { RequestFrame, ResponseFrame, EventFrame, GatewayFrame } from '@/types/gateway';

export interface ConnectIdentity {
  deviceId: string;
  publicKey: string;
}

let frameCounter = 0;

function nextId(): string {
  return `ui_${++frameCounter}_${Date.now()}`;
}

/**
 * Create the initial "connect" request that authenticates with the gateway.
 * Matches OpenClaw Gateway Protocol v3.
 */
export function createConnectFrame(token?: string, identity?: ConnectIdentity): RequestFrame {
  return {
    type: 'req',
    id: nextId(),
    method: 'connect',
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      ...(identity ? { identity } : {}),
      client: {
        id: 'openclaw-dashboard',
        version: '0.1.0',
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'web',
        mode: 'ui',
        displayName: 'Clawkins Homebase',
      },
      role: 'operator',
      scopes: ['operator.read', 'operator.write'],
      caps: [],
      auth: {
        token: token || '',
      },
    },
  };
}

/** Create a generic method request */
export function createRequestFrame(method: string, params?: Record<string, unknown>): RequestFrame {
  return {
    type: 'req',
    id: nextId(),
    method,
    params,
  };
}

/** Parse an incoming WebSocket message into a typed frame */
export function parseFrame(data: string): GatewayFrame | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object') return null;

    const obj = parsed as Record<string, unknown>;
    if (typeof obj.type !== 'string') return null;

    switch (obj.type) {
      case 'res':
        if (typeof obj.id !== 'string' || typeof obj.ok !== 'boolean') return null;
        return obj as unknown as ResponseFrame;
      case 'event':
        if (typeof obj.event !== 'string') return null;
        return obj as unknown as EventFrame;
      case 'req':
        if (typeof obj.id !== 'string' || typeof obj.method !== 'string') return null;
        return obj as unknown as RequestFrame;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function isResponseFrame(frame: GatewayFrame): frame is ResponseFrame {
  return frame.type === 'res';
}

export function isEventFrame(frame: GatewayFrame): frame is EventFrame {
  return frame.type === 'event';
}

export function isRequestFrame(frame: GatewayFrame): frame is RequestFrame {
  return frame.type === 'req';
}
