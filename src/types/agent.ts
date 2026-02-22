export type AgentStatus = 'idle' | 'thinking' | 'responding' | 'tool_calling' | 'error' | 'offline';

export type AgentPhase = 'intake' | 'reasoning' | 'planning' | 'execution' | 'reflection';

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  status: AgentStatus;
  currentPhase?: AgentPhase;
  skills: Skill[];
  config: AgentConfig;
  stats: AgentStats;
  createdAt: number;
  lastActiveAt: number;
}

export interface AgentConfig {
  soulMd?: string;
  agentsMd?: string;
  toolsMd?: string;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
}

export interface AgentStats {
  totalSessions: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  successRate: number;
}

export interface AgentLiveData {
  liveTokenUsage?: { prompt: number; completion: number; total: number };
  activeSession?: { sessionId: string; channel: string; startedAt: number; messageCount: number };
  currentTool?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  source: 'local' | 'clawhub';
}
