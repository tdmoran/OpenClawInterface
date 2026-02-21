import type { Session, TokenUsage } from '@/types/session';

// Pricing per 1K tokens (input / prompt)
export const COST_PER_1K_PROMPT: Record<string, number> = {
  'claude-opus-4-6': 0.015,
  'claude-sonnet-4-6': 0.003,
  'claude-haiku-4-5': 0.00025,
  'kimi-1.5': 0.002,
  'moonshot-v1-8k': 0.0012,
  'moonshot-v1-32k': 0.0024,
  'moonshot-v1-128k': 0.006,
};

// Pricing per 1K tokens (output / completion)
export const COST_PER_1K_COMPLETION: Record<string, number> = {
  'claude-opus-4-6': 0.075,
  'claude-sonnet-4-6': 0.015,
  'claude-haiku-4-5': 0.00125,
  'kimi-1.5': 0.01,
  'moonshot-v1-8k': 0.006,
  'moonshot-v1-32k': 0.012,
  'moonshot-v1-128k': 0.03,
};

// Default fallback rates (sonnet pricing)
const DEFAULT_PROMPT_RATE = 0.003;
const DEFAULT_COMPLETION_RATE = 0.015;

/**
 * Calculate cost for a given model and token usage.
 */
export function calculateCost(model: string, tokens: TokenUsage): number {
  const promptRate = COST_PER_1K_PROMPT[model] ?? DEFAULT_PROMPT_RATE;
  const completionRate = COST_PER_1K_COMPLETION[model] ?? DEFAULT_COMPLETION_RATE;
  return (tokens.prompt / 1000) * promptRate + (tokens.completion / 1000) * completionRate;
}

/**
 * Calculate total cost for a single session.
 */
export function calculateSessionCost(session: Session): number {
  return calculateCost(session.model, session.tokenUsage);
}

export interface AgentCostEntry {
  agentId: string;
  agentName: string;
  totalCost: number;
  totalTokens: number;
  sessionCount: number;
}

/**
 * Aggregate costs grouped by agent.
 */
export function aggregateCostByAgent(sessions: Session[]): AgentCostEntry[] {
  const map = new Map<string, AgentCostEntry>();

  for (const session of sessions) {
    const existing = map.get(session.agentId);
    const cost = calculateSessionCost(session);
    if (existing) {
      existing.totalCost += cost;
      existing.totalTokens += session.tokenUsage.total;
      existing.sessionCount += 1;
    } else {
      map.set(session.agentId, {
        agentId: session.agentId,
        agentName: session.agentName,
        totalCost: cost,
        totalTokens: session.tokenUsage.total,
        sessionCount: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
}

export interface ModelCostEntry {
  model: string;
  totalCost: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  sessionCount: number;
}

/**
 * Aggregate costs grouped by model.
 */
export function aggregateCostByModel(sessions: Session[]): ModelCostEntry[] {
  const map = new Map<string, ModelCostEntry>();

  for (const session of sessions) {
    const existing = map.get(session.model);
    const cost = calculateSessionCost(session);
    if (existing) {
      existing.totalCost += cost;
      existing.totalTokens += session.tokenUsage.total;
      existing.promptTokens += session.tokenUsage.prompt;
      existing.completionTokens += session.tokenUsage.completion;
      existing.sessionCount += 1;
    } else {
      map.set(session.model, {
        model: session.model,
        totalCost: cost,
        totalTokens: session.tokenUsage.total,
        promptTokens: session.tokenUsage.prompt,
        completionTokens: session.tokenUsage.completion,
        sessionCount: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Calculate total cost across all sessions for today.
 */
export function calculateDailyCost(sessions: Session[]): { cost: number; tokens: number } {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startTs = startOfDay.getTime();

  let cost = 0;
  let tokens = 0;

  for (const session of sessions) {
    if (session.startedAt >= startTs) {
      cost += calculateSessionCost(session);
      tokens += session.tokenUsage.total;
    }
  }

  return { cost, tokens };
}
