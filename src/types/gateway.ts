// WebSocket gateway protocol types

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface GatewayConfig {
  url: string;
  token?: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export interface GatewayFrame {
  id: string;
  type: GatewayFrameType;
  timestamp: number;
  payload: unknown;
}

export type GatewayFrameType =
  | 'auth'
  | 'auth_ok'
  | 'auth_error'
  | 'event'
  | 'request'
  | 'response'
  | 'error'
  | 'ping'
  | 'pong';

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
  | 'agent.thinking'
  | 'agent.responding'
  | 'agent.tool_call'
  | 'agent.tool_result'
  | 'agent.phase_change'
  | 'agent.error'
  | 'tool.started'
  | 'tool.completed'
  | 'tool.error'
  | 'queue.enqueued'
  | 'queue.dequeued'
  | 'queue.completed'
  | 'memory.read'
  | 'memory.write'
  | 'system.health'
  | 'system.error';

export type EventSeverity = 'info' | 'warning' | 'error' | 'debug';

export interface GatewayRequest {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface GatewayResponse {
  id: string;
  result?: unknown;
  error?: { code: number; message: string };
}
