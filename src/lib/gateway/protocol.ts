import type { RequestFrame, ResponseFrame, EventFrame, GatewayFrame } from '@/types/gateway';

let frameCounter = 0;

function nextId(): string {
  return `ui_${++frameCounter}_${Date.now()}`;
}

/**
 * Create the initial "connect" request that authenticates with the gateway.
 * Matches OpenClaw Gateway Protocol v3.
 */
export function createConnectFrame(token?: string): RequestFrame {
  return {
    type: 'req',
    id: nextId(),
    method: 'connect',
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: 'gateway-client',
        version: '0.1.0',
        platform: 'web',
        mode: 'ui',
        displayName: 'OpenClaw Dashboard',
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
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed.type !== 'string') return null;

    switch (parsed.type) {
      case 'res':
        return parsed as ResponseFrame;
      case 'event':
        return parsed as EventFrame;
      case 'req':
        return parsed as RequestFrame;
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
