import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentsStore } from '../agents-store';
import type { Agent } from '@/types/agent';

function makeAgent(id: string, overrides?: Partial<Agent>): Agent {
  return {
    id,
    name: `Agent ${id}`,
    description: 'A test agent',
    model: 'claude-opus-4-20250514',
    status: 'idle',
    skills: [],
    config: {
      maxTokens: 4096,
      temperature: 0.7,
    },
    stats: {
      totalSessions: 0,
      totalTokens: 0,
      totalCost: 0,
      avgResponseTime: 0,
      successRate: 1.0,
    },
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    ...overrides,
  };
}

describe('agents-store', () => {
  beforeEach(() => {
    useAgentsStore.setState({
      agents: new Map(),
      selectedAgentId: null,
    });
  });

  describe('setAgent', () => {
    it('adds a new agent', () => {
      const agent = makeAgent('a1');
      useAgentsStore.getState().setAgent(agent);
      expect(useAgentsStore.getState().agents.size).toBe(1);
      expect(useAgentsStore.getState().agents.get('a1')).toEqual(agent);
    });

    it('overwrites an existing agent with the same id', () => {
      useAgentsStore.getState().setAgent(makeAgent('a1', { name: 'Original' }));
      useAgentsStore.getState().setAgent(makeAgent('a1', { name: 'Updated' }));
      expect(useAgentsStore.getState().agents.size).toBe(1);
      expect(useAgentsStore.getState().agents.get('a1')!.name).toBe('Updated');
    });

    it('can add multiple agents', () => {
      useAgentsStore.getState().setAgent(makeAgent('a1'));
      useAgentsStore.getState().setAgent(makeAgent('a2'));
      useAgentsStore.getState().setAgent(makeAgent('a3'));
      expect(useAgentsStore.getState().agents.size).toBe(3);
    });
  });

  describe('removeAgent', () => {
    it('removes an existing agent', () => {
      useAgentsStore.getState().setAgent(makeAgent('a1'));
      useAgentsStore.getState().setAgent(makeAgent('a2'));
      useAgentsStore.getState().removeAgent('a1');
      expect(useAgentsStore.getState().agents.size).toBe(1);
      expect(useAgentsStore.getState().agents.has('a1')).toBe(false);
      expect(useAgentsStore.getState().agents.has('a2')).toBe(true);
    });

    it('does nothing when removing a non-existent agent', () => {
      useAgentsStore.getState().setAgent(makeAgent('a1'));
      useAgentsStore.getState().removeAgent('nonexistent');
      expect(useAgentsStore.getState().agents.size).toBe(1);
    });
  });

  describe('updateAgent', () => {
    it('partially updates an existing agent', () => {
      useAgentsStore.getState().setAgent(makeAgent('a1', { status: 'idle', name: 'Test Agent' }));
      useAgentsStore.getState().updateAgent('a1', { status: 'thinking' });
      const agent = useAgentsStore.getState().agents.get('a1')!;
      expect(agent.status).toBe('thinking');
      expect(agent.name).toBe('Test Agent'); // unchanged
    });

    it('updates the current phase', () => {
      useAgentsStore.getState().setAgent(makeAgent('a1'));
      useAgentsStore.getState().updateAgent('a1', { currentPhase: 'reasoning' });
      expect(useAgentsStore.getState().agents.get('a1')!.currentPhase).toBe('reasoning');
    });

    it('does nothing when updating a non-existent agent', () => {
      useAgentsStore.getState().updateAgent('nonexistent', { status: 'error' });
      expect(useAgentsStore.getState().agents.size).toBe(0);
    });
  });

  describe('setSelectedAgentId', () => {
    it('sets the selected agent id', () => {
      useAgentsStore.getState().setSelectedAgentId('a1');
      expect(useAgentsStore.getState().selectedAgentId).toBe('a1');
    });

    it('clears the selected agent id with null', () => {
      useAgentsStore.getState().setSelectedAgentId('a1');
      useAgentsStore.getState().setSelectedAgentId(null);
      expect(useAgentsStore.getState().selectedAgentId).toBeNull();
    });
  });

  describe('getAgents', () => {
    it('returns an array of all agents', () => {
      useAgentsStore.getState().setAgent(makeAgent('a1'));
      useAgentsStore.getState().setAgent(makeAgent('a2'));
      const agents = useAgentsStore.getState().getAgents();
      expect(agents).toHaveLength(2);
      const ids = agents.map((a) => a.id);
      expect(ids).toContain('a1');
      expect(ids).toContain('a2');
    });

    it('returns empty array when no agents exist', () => {
      expect(useAgentsStore.getState().getAgents()).toEqual([]);
    });

    it('returns agent objects with all expected fields', () => {
      const agent = makeAgent('a1', {
        skills: [
          { id: 'sk1', name: 'Search', description: 'Web search', version: '1.0', enabled: true, source: 'local' },
        ],
      });
      useAgentsStore.getState().setAgent(agent);
      const agents = useAgentsStore.getState().getAgents();
      expect(agents[0].skills).toHaveLength(1);
      expect(agents[0].skills[0].name).toBe('Search');
    });
  });
});
