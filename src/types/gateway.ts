// WebSocket gateway protocol types — matches OpenClaw Gateway Protocol v3

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface GatewayConfig {
  url: string;
  token?: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

/** A saved gateway profile for multi-gateway support */
export interface GatewayProfile {
  id: string;
  name: string;
  url: string;
  token: string;
}

// -- Frame types matching OpenClaw protocol v3 --

export type GatewayFrameType = 'req' | 'res' | 'event';

/** Request frame: client → gateway */
export interface RequestFrame {
  type: 'req';
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

/** Response frame: gateway → client */
export interface ResponseFrame {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string; details?: unknown; retryable?: boolean; retryAfterMs?: number };
}

/** Event frame: gateway → client */
export interface EventFrame {
  type: 'event';
  event: string;
  payload?: Record<string, unknown>;
  seq?: number;
}

export type GatewayFrame = RequestFrame | ResponseFrame | EventFrame;

// -- Legacy types kept for store/UI compatibility --

export interface GatewayEvent {
  id: string;
  type: EventType;
  timestamp: number;
  sessionId?: string;
  agentId?: string;
  data: Record<string, unknown>;
}

export type EventType =
  | 'session.started'
  | 'session.ended'
  | 'session.error'
  | 'session.token_update'
  | 'agent.thinking'
  | 'agent.responding'
  | 'agent.tool_call'
  | 'agent.tool_result'
  | 'agent.phase_change'
  | 'agent.error'
  | 'tool.started'
  | 'tool.completed'
  | 'tool.result'
  | 'tool.error'
  | 'cost.updated'
  | 'queue.enqueued'
  | 'queue.dequeued'
  | 'queue.completed'
  | 'memory.read'
  | 'memory.write'
  | 'system.health'
  | 'system.error'
  | 'health'
  | 'presence'
  | 'cron.job.updated'
  | 'cron.job.removed'
  | 'cron.run.started'
  | 'cron.run.completed';

export type EventSeverity = 'info' | 'warning' | 'error' | 'debug';

export interface GatewayResponse {
  id: string;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}
