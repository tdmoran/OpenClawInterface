import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@/types/session';
import type { AgentCostEntry, ModelCostEntry } from '@/lib/cost-utils';
import {
  aggregateCostByAgent,
  aggregateCostByModel,
  calculateDailyCost,
  calculateSessionCost,
} from '@/lib/cost-utils';

export interface CostHistoryEntry {
  timestamp: number;
  cost: number;
  tokens: number;
}

interface CostState {
  dailyCost: number;
  dailyTokens: number;
  costByAgent: AgentCostEntry[];
  costByModel: ModelCostEntry[];
  costHistory: CostHistoryEntry[];
  recalculate: (sessions: Session[]) => void;
  addSessionCost: (session: Session) => void;
}

export const useCostStore = create<CostState>()(
  persist(
    (set, get) => ({
      dailyCost: 0,
      dailyTokens: 0,
      costByAgent: [],
      costByModel: [],
      costHistory: [],

      recalculate: (sessions) => {
        const { cost, tokens } = calculateDailyCost(sessions);
        const costByAgent = aggregateCostByAgent(sessions);
        const costByModel = aggregateCostByModel(sessions);

        // Append a history entry only if cost changed
        const prev = get().costHistory;
        const lastEntry = prev[prev.length - 1];
        const costHistory =
          !lastEntry || Math.abs(lastEntry.cost - cost) > 0.001
            ? [...prev.slice(-99), { timestamp: Date.now(), cost, tokens }]
            : prev;

        set({ dailyCost: cost, dailyTokens: tokens, costByAgent, costByModel, costHistory });
      },

      addSessionCost: (session) => {
        const sessionCost = calculateSessionCost(session);
        set((state) => {
          const newDailyCost = state.dailyCost + sessionCost;
          const newDailyTokens = state.dailyTokens + session.tokenUsage.total;

          // Update agent aggregation
          const agentIdx = state.costByAgent.findIndex((a) => a.agentId === session.agentId);
          const costByAgent = [...state.costByAgent];
          if (agentIdx >= 0) {
            costByAgent[agentIdx] = {
              ...costByAgent[agentIdx],
              totalCost: costByAgent[agentIdx].totalCost + sessionCost,
              totalTokens: costByAgent[agentIdx].totalTokens + session.tokenUsage.total,
              sessionCount: costByAgent[agentIdx].sessionCount + 1,
            };
          } else {
            costByAgent.push({
              agentId: session.agentId,
              agentName: session.agentName,
              totalCost: sessionCost,
              totalTokens: session.tokenUsage.total,
              sessionCount: 1,
            });
          }
          costByAgent.sort((a, b) => b.totalCost - a.totalCost);

          // Update model aggregation
          const modelIdx = state.costByModel.findIndex((m) => m.model === session.model);
          const costByModel = [...state.costByModel];
          if (modelIdx >= 0) {
            costByModel[modelIdx] = {
              ...costByModel[modelIdx],
              totalCost: costByModel[modelIdx].totalCost + sessionCost,
              totalTokens: costByModel[modelIdx].totalTokens + session.tokenUsage.total,
              promptTokens: costByModel[modelIdx].promptTokens + session.tokenUsage.prompt,
              completionTokens: costByModel[modelIdx].completionTokens + session.tokenUsage.completion,
              sessionCount: costByModel[modelIdx].sessionCount + 1,
            };
          } else {
            costByModel.push({
              model: session.model,
              totalCost: sessionCost,
              totalTokens: session.tokenUsage.total,
              promptTokens: session.tokenUsage.prompt,
              completionTokens: session.tokenUsage.completion,
              sessionCount: 1,
            });
          }
          costByModel.sort((a, b) => b.totalCost - a.totalCost);

          // Append history
          const costHistory = [
            ...state.costHistory.slice(-99),
            { timestamp: Date.now(), cost: newDailyCost, tokens: newDailyTokens },
          ];

          return {
            dailyCost: newDailyCost,
            dailyTokens: newDailyTokens,
            costByAgent,
            costByModel,
            costHistory,
          };
        });
      },
    }),
    {
      name: 'openclaw-costs',
      version: 1,
      partialize: (state) => ({
        dailyCost: state.dailyCost,
        dailyTokens: state.dailyTokens,
        costByAgent: state.costByAgent,
        costByModel: state.costByModel,
        costHistory: state.costHistory,
      }),
    }
  )
);
