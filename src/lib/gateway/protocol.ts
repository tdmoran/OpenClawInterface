import type { GatewayFrame, GatewayFrameType } from '@/types/gateway';

let frameCounter = 0;

export function createFrame(type: GatewayFrameType, payload: unknown): GatewayFrame {
  return {
    id: `frame_${++frameCounter}_${Date.now()}`,
    type,
    timestamp: Date.now(),
    payload,
  };
}

export function createAuthFrame(token?: string): GatewayFrame {
  return createFrame('auth', { token: token || '' });
}

export function createRequestFrame(method: string, params?: Record<string, unknown>): GatewayFrame {
  return createFrame('request', { method, params });
}

export function createPingFrame(): GatewayFrame {
  return createFrame('ping', {});
}

export function parseFrame(data: string): GatewayFrame | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed.type === 'string' && typeof parsed.timestamp === 'number') {
      return parsed as GatewayFrame;
    }
    return null;
  } catch {
    return null;
  }
}

export function isEventFrame(frame: GatewayFrame): boolean {
  return frame.type === 'event';
}

export function isResponseFrame(frame: GatewayFrame): boolean {
  return frame.type === 'response';
}

export function isErrorFrame(frame: GatewayFrame): boolean {
  return frame.type === 'error';
}
