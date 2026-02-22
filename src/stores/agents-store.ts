import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Agent } from '@/types/agent';

interface AgentsState {
  agents: Map<string, Agent>;
  selectedAgentId: string | null;
  setAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
  updateAgent: (id: string, update: Partial<Agent>) => void;
  setSelectedAgentId: (id: string | null) => void;
  getAgents: () => Agent[];
}

export const useAgentsStore = create<AgentsState>()(
  persist(
    (set, get) => ({
      agents: new Map(),
      selectedAgentId: null,
      setAgent: (agent) =>
        set((state) => {
          const agents = new Map(state.agents);
          agents.set(agent.id, agent);
          return { agents };
        }),
      removeAgent: (id) =>
        set((state) => {
          const agents = new Map(state.agents);
          agents.delete(id);
          return { agents };
        }),
      updateAgent: (id, update) =>
        set((state) => {
          const agents = new Map(state.agents);
          const existing = agents.get(id);
          if (existing) {
            agents.set(id, { ...existing, ...update });
          }
          return { agents };
        }),
      setSelectedAgentId: (id) => set({ selectedAgentId: id }),
      getAgents: () => Array.from(get().agents.values()),
    }),
    {
      name: 'openclaw-agents',
      version: 1,
      partialize: (state) => ({
        agents: Array.from(state.agents.entries()),
      }),
      merge: (persisted, current) => {
        const typed = persisted as {
          agents?: [string, Agent][];
        } | undefined;
        return {
          ...current,
          agents: typed?.agents
            ? new Map(typed.agents)
            : current.agents,
        };
      },
    }
  )
);
