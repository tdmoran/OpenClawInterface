import type { Agent } from '@/types/agent';
import type { Session } from '@/types/session';
import type { SystemHealth, DashboardStats, ActivityEntry, LogEntry } from '@/types/events';

export const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'CodeAssist',
    description: 'Primary coding assistant with full tool access',
    model: 'claude-sonnet-4-6',
    status: 'idle',
    currentPhase: undefined,
    skills: [
      { id: 'sk-1', name: 'code-edit', description: 'Edit files', version: '1.0.0', enabled: true, source: 'local' },
      { id: 'sk-2', name: 'web-search', description: 'Search the web', version: '1.2.0', enabled: true, source: 'clawhub' },
      { id: 'sk-3', name: 'git-ops', description: 'Git operations', version: '1.0.0', enabled: true, source: 'local' },
    ],
    config: {
      soulMd: '# CodeAssist\nYou are a helpful coding assistant...',
      agentsMd: '# Agents\n- CodeAssist: primary agent',
      toolsMd: '# Tools\n- code-edit\n- web-search\n- git-ops',
      maxTokens: 8192,
      temperature: 0.7,
      systemPrompt: 'You are CodeAssist, a skilled software engineer.',
    },
    stats: { totalSessions: 142, totalTokens: 2450000, totalCost: 18.50, avgResponseTime: 2.3, successRate: 0.97 },
    createdAt: Date.now() - 86400000 * 30,
    lastActiveAt: Date.now() - 300000,
  },
  {
    id: 'agent-2',
    name: 'ResearchBot',
    description: 'Research and analysis agent',
    model: 'claude-opus-4-6',
    status: 'thinking',
    currentPhase: 'reasoning',
    skills: [
      { id: 'sk-4', name: 'web-search', description: 'Search the web', version: '1.2.0', enabled: true, source: 'clawhub' },
      { id: 'sk-5', name: 'summarize', description: 'Summarize content', version: '1.0.0', enabled: true, source: 'local' },
    ],
    config: {
      soulMd: '# ResearchBot\nYou are a research specialist...',
      maxTokens: 16384,
      temperature: 0.3,
    },
    stats: { totalSessions: 67, totalTokens: 4200000, totalCost: 85.20, avgResponseTime: 8.1, successRate: 0.94 },
    createdAt: Date.now() - 86400000 * 14,
    lastActiveAt: Date.now() - 60000,
  },
  {
    id: 'agent-3',
    name: 'DevOps',
    description: 'Infrastructure and deployment agent',
    model: 'claude-haiku-4-5',
    status: 'idle',
    skills: [
      { id: 'sk-6', name: 'docker', description: 'Docker operations', version: '1.0.0', enabled: true, source: 'local' },
      { id: 'sk-7', name: 'k8s', description: 'Kubernetes operations', version: '0.9.0', enabled: true, source: 'clawhub' },
    ],
    config: { maxTokens: 4096, temperature: 0.2 },
    stats: { totalSessions: 28, totalTokens: 890000, totalCost: 2.10, avgResponseTime: 1.1, successRate: 0.99 },
    createdAt: Date.now() - 86400000 * 7,
    lastActiveAt: Date.now() - 3600000,
  },
];

export const mockSessions: Session[] = [
  {
    id: 'sess-1',
    agentId: 'agent-1',
    agentName: 'CodeAssist',
    channel: 'cli',
    status: 'active',
    model: 'claude-sonnet-4-6',
    startedAt: Date.now() - 120000,
    tokenUsage: { prompt: 4200, completion: 1800, total: 6000 },
    cost: 0.042,
    messageCount: 8,
    toolCallCount: 3,
    traces: [],
  },
  {
    id: 'sess-2',
    agentId: 'agent-2',
    agentName: 'ResearchBot',
    channel: 'api',
    status: 'active',
    model: 'claude-opus-4-6',
    startedAt: Date.now() - 300000,
    tokenUsage: { prompt: 12000, completion: 8500, total: 20500 },
    cost: 0.615,
    messageCount: 4,
    toolCallCount: 12,
    traces: [],
  },
  {
    id: 'sess-3',
    agentId: 'agent-1',
    agentName: 'CodeAssist',
    channel: 'discord',
    status: 'completed',
    model: 'claude-sonnet-4-6',
    startedAt: Date.now() - 7200000,
    endedAt: Date.now() - 3600000,
    tokenUsage: { prompt: 8400, completion: 3200, total: 11600 },
    cost: 0.081,
    messageCount: 14,
    toolCallCount: 6,
    traces: [],
  },
  {
    id: 'sess-4',
    agentId: 'agent-3',
    agentName: 'DevOps',
    channel: 'slack',
    status: 'completed',
    model: 'claude-haiku-4-5',
    startedAt: Date.now() - 86400000,
    endedAt: Date.now() - 82800000,
    tokenUsage: { prompt: 2100, completion: 900, total: 3000 },
    cost: 0.003,
    messageCount: 6,
    toolCallCount: 2,
    traces: [],
  },
  {
    id: 'sess-5',
    agentId: 'agent-2',
    agentName: 'ResearchBot',
    channel: 'api',
    status: 'error',
    model: 'claude-opus-4-6',
    startedAt: Date.now() - 43200000,
    endedAt: Date.now() - 42000000,
    tokenUsage: { prompt: 6000, completion: 200, total: 6200 },
    cost: 0.186,
    messageCount: 2,
    toolCallCount: 1,
    traces: [],
  },
];

export const mockHealth: SystemHealth = {
  gateway: { status: 'healthy', latency: 12, version: '0.4.2' },
  channels: [
    { name: 'CLI', type: 'cli', status: 'connected', messageRate: 2.4 },
    { name: 'Discord', type: 'discord', status: 'connected', messageRate: 0.8 },
    { name: 'Slack', type: 'slack', status: 'disconnected', messageRate: 0 },
    { name: 'API', type: 'api', status: 'connected', messageRate: 5.2 },
  ],
  queue: { pending: 3, processing: 2, completed: 847, failed: 12, avgWaitTime: 1.2 },
  uptime: 86400 * 3 + 14520,
  timestamp: Date.now(),
};

export const mockStats: DashboardStats = {
  activeSessions: 2,
  totalAgents: 3,
  runningProcesses: 5,
  totalTokensToday: 128400,
  totalCostToday: 4.82,
  errorRate: 0.023,
};

export const mockActivity: ActivityEntry[] = [
  { id: 'act-1', timestamp: Date.now() - 30000, type: 'session.started', description: 'CodeAssist started CLI session', agentId: 'agent-1', sessionId: 'sess-1' },
  { id: 'act-2', timestamp: Date.now() - 120000, type: 'agent.tool_call', description: 'ResearchBot called web-search', agentId: 'agent-2', sessionId: 'sess-2' },
  { id: 'act-3', timestamp: Date.now() - 300000, type: 'session.started', description: 'ResearchBot started API session', agentId: 'agent-2', sessionId: 'sess-2' },
  { id: 'act-4', timestamp: Date.now() - 600000, type: 'agent.tool_result', description: 'CodeAssist code-edit completed', agentId: 'agent-1', sessionId: 'sess-1' },
  { id: 'act-5', timestamp: Date.now() - 1800000, type: 'session.ended', description: 'CodeAssist Discord session ended', agentId: 'agent-1', sessionId: 'sess-3' },
  { id: 'act-6', timestamp: Date.now() - 3600000, type: 'session.error', description: 'ResearchBot API session failed', agentId: 'agent-2', sessionId: 'sess-5' },
  { id: 'act-7', timestamp: Date.now() - 7200000, type: 'agent.phase_change', description: 'DevOps entered execution phase', agentId: 'agent-3', sessionId: 'sess-4' },
  { id: 'act-8', timestamp: Date.now() - 10800000, type: 'session.started', description: 'DevOps started Slack session', agentId: 'agent-3', sessionId: 'sess-4' },
];

export const mockTokenData = [
  { time: '00:00', prompt: 2400, completion: 1200, total: 3600 },
  { time: '02:00', prompt: 800, completion: 400, total: 1200 },
  { time: '04:00', prompt: 400, completion: 200, total: 600 },
  { time: '06:00', prompt: 1200, completion: 600, total: 1800 },
  { time: '08:00', prompt: 5600, completion: 2800, total: 8400 },
  { time: '10:00', prompt: 12000, completion: 6000, total: 18000 },
  { time: '12:00', prompt: 18000, completion: 9000, total: 27000 },
  { time: '14:00', prompt: 22000, completion: 11000, total: 33000 },
  { time: '16:00', prompt: 16000, completion: 8000, total: 24000 },
  { time: '18:00', prompt: 8000, completion: 4000, total: 12000 },
  { time: '20:00', prompt: 4000, completion: 2000, total: 6000 },
  { time: '22:00', prompt: 2000, completion: 1000, total: 3000 },
];

const severities = ['info', 'info', 'info', 'info', 'warning', 'error', 'debug'] as const;
const eventTypes = [
  'session.started', 'session.ended', 'agent.thinking', 'agent.responding',
  'agent.tool_call', 'agent.tool_result', 'tool.started', 'tool.completed',
  'queue.enqueued', 'queue.dequeued', 'system.health',
] as const;
const messages = [
  'Session initialized with claude-sonnet-4-6',
  'Agent entered reasoning phase',
  'Tool call: code-edit started',
  'Tool result received (success)',
  'Generating response to user',
  'Queue item processed',
  'Health check passed',
  'Memory write completed',
  'Token limit approaching (80%)',
  'Rate limit warning: 45/50 requests',
  'Connection timeout to external API',
  'Session completed successfully',
];

export function generateMockLogs(count: number): LogEntry[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    timestamp: now - (count - i) * 2000,
    type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    severity: severities[Math.floor(Math.random() * severities.length)],
    sessionId: mockSessions[Math.floor(Math.random() * mockSessions.length)].id,
    agentId: mockAgents[Math.floor(Math.random() * mockAgents.length)].id,
    message: messages[Math.floor(Math.random() * messages.length)],
  }));
}
