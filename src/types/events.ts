import type { EventSeverity, EventType } from './gateway';

export interface LogEntry {
  id: string;
  timestamp: number;
  type: EventType;
  severity: EventSeverity;
  sessionId?: string;
  agentId?: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface SystemHealth {
  gateway: ServiceHealth;
  channels: ChannelHealth[];
  queue: QueueHealth;
  uptime: number;
  timestamp: number;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  version: string;
}

export interface ChannelHealth {
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  messageRate: number;
}

export interface QueueHealth {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avgWaitTime: number;
}

export interface DashboardStats {
  activeSessions: number;
  totalAgents: number;
  runningProcesses: number;
  totalTokensToday: number;
  totalCostToday: number;
  errorRate: number;
}

export interface ActivityEntry {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  agentId?: string;
  sessionId?: string;
}
