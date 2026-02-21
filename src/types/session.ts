export type SessionStatus = 'active' | 'completed' | 'error' | 'timeout';

export interface Session {
  id: string;
  agentId: string;
  agentName: string;
  channel: string;
  status: SessionStatus;
  model: string;
  startedAt: number;
  endedAt?: number;
  tokenUsage: TokenUsage;
  cost: number;
  messageCount: number;
  toolCallCount: number;
  traces: Trace[];
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface Trace {
  id: string;
  sessionId: string;
  type: TraceType;
  timestamp: number;
  duration?: number;
  data: TraceData;
  children?: Trace[];
}

export type TraceType = 'user_message' | 'assistant_message' | 'tool_call' | 'tool_result' | 'reasoning' | 'error';

export interface TraceData {
  content?: string;
  role?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;
  tokens?: TokenUsage;
  model?: string;
  error?: string;
}

export interface QueueItem {
  id: string;
  sessionId: string;
  type: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}
