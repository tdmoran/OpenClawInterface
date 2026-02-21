'use client';

import { useAgentsStore } from '@/stores/agents-store';

export function useAgents() {
  const agents = useAgentsStore((s) => s.getAgents());
  const selectedAgentId = useAgentsStore((s) => s.selectedAgentId);
  const setSelectedAgentId = useAgentsStore((s) => s.setSelectedAgentId);

  return {
    agents,
    selectedAgentId,
    setSelectedAgentId,
  };
}
