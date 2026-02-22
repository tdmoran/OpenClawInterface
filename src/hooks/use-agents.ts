'use client';

import { useMemo } from 'react';
import { useAgentsStore } from '@/stores/agents-store';

export function useAgents() {
  const agentsMap = useAgentsStore((s) => s.agents);
  const agents = useMemo(() => Array.from(agentsMap.values()), [agentsMap]);
  const selectedAgentId = useAgentsStore((s) => s.selectedAgentId);
  const setSelectedAgentId = useAgentsStore((s) => s.setSelectedAgentId);

  return {
    agents,
    selectedAgentId,
    setSelectedAgentId,
  };
}
