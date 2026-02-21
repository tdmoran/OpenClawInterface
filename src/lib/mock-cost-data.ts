import type { AgentCostEntry, ModelCostEntry } from '@/lib/cost-utils';
import type { CostHistoryEntry } from '@/stores/cost-store';

export const mockCostByAgent: AgentCostEntry[] = [
  {
    agentId: 'agent-2',
    agentName: 'ResearchBot',
    totalCost: 2.84,
    totalTokens: 26700,
    sessionCount: 4,
  },
  {
    agentId: 'agent-1',
    agentName: 'CodeAssist',
    totalCost: 1.72,
    totalTokens: 78400,
    sessionCount: 8,
  },
  {
    agentId: 'agent-3',
    agentName: 'DevOps',
    totalCost: 0.26,
    totalTokens: 23300,
    sessionCount: 3,
  },
];

export const mockCostByModel: ModelCostEntry[] = [
  {
    model: 'claude-opus-4-6',
    totalCost: 2.84,
    totalTokens: 26700,
    promptTokens: 18000,
    completionTokens: 8700,
    sessionCount: 4,
  },
  {
    model: 'claude-sonnet-4-6',
    totalCost: 1.72,
    totalTokens: 78400,
    promptTokens: 52200,
    completionTokens: 26200,
    sessionCount: 8,
  },
  {
    model: 'claude-haiku-4-5',
    totalCost: 0.26,
    totalTokens: 23300,
    promptTokens: 15800,
    completionTokens: 7500,
    sessionCount: 3,
  },
];

// Generate hourly cost history for the current day
function generateMockCostHistory(): CostHistoryEntry[] {
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startTs = startOfDay.getTime();

  const entries: CostHistoryEntry[] = [];
  let cumulativeCost = 0;
  let cumulativeTokens = 0;

  // Generate entries at hourly intervals
  const hourMs = 3600_000;
  const hourlyProfile = [
    0.08, 0.04, 0.02, 0.01, 0.02, 0.05,
    0.12, 0.28, 0.45, 0.52, 0.48, 0.55,
    0.62, 0.58, 0.42, 0.38, 0.30, 0.22,
    0.15, 0.10, 0.08, 0.06, 0.04, 0.03,
  ];

  for (let hour = 0; hour < 24; hour++) {
    const ts = startTs + hour * hourMs;
    if (ts > now) break;

    const costIncrement = hourlyProfile[hour] ?? 0.05;
    const tokenIncrement = Math.round(costIncrement * 18000);
    cumulativeCost += costIncrement;
    cumulativeTokens += tokenIncrement;

    entries.push({
      timestamp: ts,
      cost: Math.round(cumulativeCost * 100) / 100,
      tokens: cumulativeTokens,
    });
  }

  return entries;
}

export const mockCostHistory: CostHistoryEntry[] = generateMockCostHistory();

export const mockDailyCost = 4.82;
export const mockDailyTokens = 128400;
