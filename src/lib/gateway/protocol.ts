import type { RequestFrame, ResponseFrame, EventFrame, GatewayFrame } from '@/types/gateway';

/** Signed device identity included in the connect frame after challenge-response. */
export interface ConnectDevice {
  id: string;         // hex SHA-256 of raw public key
  publicKey: string;  // base64url raw Ed25519 public key
  signature: string;  // base64url Ed25519 signature of the v2 auth payload
  signedAt: number;   // ms timestamp when signature was created
  nonce: string;      // the nonce from the connect.challenge event
}

/** Client metadata constants — must match the signed payload exactly. */
export const CLIENT_ID = 'openclaw-control-ui';
export const CLIENT_MODE = 'ui';
export const CONNECT_ROLE = 'operator';
export const CONNECT_SCOPES: string[] = ['operator.read', 'operator.write'];

let frameCounter = 0;

function nextId(): string {
  return `ui_${++frameCounter}_${Date.now()}`;
}

/**
 * Create the initial "connect" request that authenticates with the gateway.
 * Matches OpenClaw Gateway Protocol v3.
 *
 * The `device` param is provided after receiving and signing a connect.challenge.
 */
export function createConnectFrame(token?: string, device?: ConnectDevice): RequestFrame {
  return {
    type: 'req',
    id: nextId(),
    method: 'connect',
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      ...(device ? { device } : {}),
      client: {
        id: CLIENT_ID,
        version: '0.1.0',
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'web',
        mode: CLIENT_MODE,
        displayName: 'Clawkins Homebase',
      },
      role: CONNECT_ROLE,
      scopes: CONNECT_SCOPES,
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
