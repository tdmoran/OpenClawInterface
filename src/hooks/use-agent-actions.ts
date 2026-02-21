'use client';

import { useState, useCallback } from 'react';
import { useGateway } from '@/hooks/use-gateway';
import { useAgentsStore } from '@/stores/agents-store';
import type { Agent } from '@/types/agent';

interface UseAgentActionsReturn {
  createAgent: (agent: Omit<Agent, 'id' | 'stats' | 'createdAt' | 'lastActiveAt'>) => Promise<void>;
  updateAgent: (id: string, update: Partial<Agent>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useAgentActions(): UseAgentActionsReturn {
  const { client, isConnected } = useGateway();
  const setAgent = useAgentsStore((s) => s.setAgent);
  const removeAgent = useAgentsStore((s) => s.removeAgent);
  const storeUpdateAgent = useAgentsStore((s) => s.updateAgent);
  const agents = useAgentsStore((s) => s.agents);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAgent = useCallback(
    async (agentData: Omit<Agent, 'id' | 'stats' | 'createdAt' | 'lastActiveAt'>) => {
      if (!isConnected || !client) {
        setError('Not connected to gateway');
        return;
      }

      setIsLoading(true);
      setError(null);

      const newAgent: Agent = {
        ...agentData,
        id: `agent-${Date.now()}`,
        stats: {
          totalSessions: 0,
          totalTokens: 0,
          totalCost: 0,
          avgResponseTime: 0,
          successRate: 0,
        },
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      };

      // Optimistic update
      setAgent(newAgent);

      try {
        await client.request('agent.create', {
          name: newAgent.name,
          description: newAgent.description,
          model: newAgent.model,
          status: newAgent.status,
          skills: newAgent.skills,
          config: newAgent.config,
        });
      } catch (err) {
        // Rollback on error
        removeAgent(newAgent.id);
        const message = err instanceof Error ? err.message : 'Failed to create agent';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [client, isConnected, setAgent, removeAgent]
  );

  const updateAgent = useCallback(
    async (id: string, update: Partial<Agent>) => {
      if (!isConnected || !client) {
        setError('Not connected to gateway');
        return;
      }

      setIsLoading(true);
      setError(null);

      // Save previous state for rollback
      const previous = agents.get(id);

      // Optimistic update
      storeUpdateAgent(id, update);

      try {
        await client.request('agent.update', { agentId: id, ...update });
      } catch (err) {
        // Rollback on error
        if (previous) {
          storeUpdateAgent(id, previous);
        }
        const message = err instanceof Error ? err.message : 'Failed to update agent';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [client, isConnected, agents, storeUpdateAgent]
  );

  const deleteAgent = useCallback(
    async (id: string) => {
      if (!isConnected || !client) {
        setError('Not connected to gateway');
        return;
      }

      setIsLoading(true);
      setError(null);

      // Save previous state for rollback
      const previous = agents.get(id);

      // Optimistic update
      removeAgent(id);

      try {
        await client.request('agent.delete', { agentId: id });
      } catch (err) {
        // Rollback on error
        if (previous) {
          setAgent(previous);
        }
        const message = err instanceof Error ? err.message : 'Failed to delete agent';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [client, isConnected, agents, removeAgent, setAgent]
  );

  return { createAgent, updateAgent, deleteAgent, isLoading, error };
}
