'use client';

import { useEffect, useMemo } from 'react';
import { useSessionsStore } from '@/stores/sessions-store';
import { useCostStore } from '@/stores/cost-store';
import { useConnectionStore } from '@/stores/connection-store';
import {
  mockCostByAgent,
  mockCostByModel,
  mockCostHistory,
  mockDailyCost,
  mockDailyTokens,
} from '@/lib/mock-cost-data';
import type { AgentCostEntry, ModelCostEntry } from '@/lib/cost-utils';
import type { CostHistoryEntry } from '@/stores/cost-store';

interface CostTrackingResult {
  dailyCost: number;
  dailyTokens: number;
  costByAgent: AgentCostEntry[];
  costByModel: ModelCostEntry[];
  costHistory: CostHistoryEntry[];
}

export function useCostTracking(): CostTrackingResult {
  const connectionStatus = useConnectionStore((s) => s.status);
  const sessions = useSessionsStore((s) => s.sessions);
  const recalculate = useCostStore((s) => s.recalculate);
  const dailyCost = useCostStore((s) => s.dailyCost);
  const dailyTokens = useCostStore((s) => s.dailyTokens);
  const costByAgent = useCostStore((s) => s.costByAgent);
  const costByModel = useCostStore((s) => s.costByModel);
  const costHistory = useCostStore((s) => s.costHistory);

  const isConnected = connectionStatus === 'connected';

  // Convert Map to array for dependency tracking
  const sessionList = useMemo(() => Array.from(sessions.values()), [sessions]);

  // Recalculate when sessions change and gateway is connected
  useEffect(() => {
    if (isConnected && sessionList.length > 0) {
      recalculate(sessionList);
    }
  }, [isConnected, sessionList, recalculate]);

  // Return mock data when disconnected, live data when connected
  if (!isConnected) {
    return {
      dailyCost: mockDailyCost,
      dailyTokens: mockDailyTokens,
      costByAgent: mockCostByAgent,
      costByModel: mockCostByModel,
      costHistory: mockCostHistory,
    };
  }

  return {
    dailyCost,
    dailyTokens,
    costByAgent,
    costByModel,
    costHistory,
  };
}
