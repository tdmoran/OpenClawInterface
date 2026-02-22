import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionsStore } from '../sessions-store';
import type { Session, QueueItem } from '@/types/session';

function makeSession(id: string, overrides?: Partial<Session>): Session {
  return {
    id,
    agentId: 'agent-1',
    agentName: 'Test Agent',
    channel: 'cli',
    status: 'active',
    model: 'claude-opus-4-20250514',
    startedAt: Date.now(),
    tokenUsage: { prompt: 100, completion: 50, total: 150 },
    cost: 0.01,
    messageCount: 5,
    toolCallCount: 2,
    traces: [],
    ...overrides,
  };
}

describe('sessions-store', () => {
  beforeEach(() => {
    useSessionsStore.setState({
      sessions: new Map(),
      queue: [],
      activeSessionId: null,
    });
  });

  describe('setSession', () => {
    it('adds a new session', () => {
      const session = makeSession('s1');
      useSessionsStore.getState().setSession(session);
      expect(useSessionsStore.getState().sessions.size).toBe(1);
      expect(useSessionsStore.getState().sessions.get('s1')).toEqual(session);
    });

    it('overwrites an existing session with the same id', () => {
      useSessionsStore.getState().setSession(makeSession('s1', { messageCount: 1 }));
      useSessionsStore.getState().setSession(makeSession('s1', { messageCount: 99 }));
      expect(useSessionsStore.getState().sessions.size).toBe(1);
      expect(useSessionsStore.getState().sessions.get('s1')!.messageCount).toBe(99);
    });

    it('adds multiple sessions with different ids', () => {
      useSessionsStore.getState().setSession(makeSession('s1'));
      useSessionsStore.getState().setSession(makeSession('s2'));
      useSessionsStore.getState().setSession(makeSession('s3'));
      expect(useSessionsStore.getState().sessions.size).toBe(3);
    });
  });

  describe('removeSession', () => {
    it('removes an existing session', () => {
      useSessionsStore.getState().setSession(makeSession('s1'));
      useSessionsStore.getState().setSession(makeSession('s2'));
      useSessionsStore.getState().removeSession('s1');
      expect(useSessionsStore.getState().sessions.size).toBe(1);
      expect(useSessionsStore.getState().sessions.has('s1')).toBe(false);
    });

    it('does nothing when removing a non-existent session', () => {
      useSessionsStore.getState().setSession(makeSession('s1'));
      useSessionsStore.getState().removeSession('nonexistent');
      expect(useSessionsStore.getState().sessions.size).toBe(1);
    });
  });

  describe('updateSession', () => {
    it('partially updates an existing session', () => {
      useSessionsStore.getState().setSession(makeSession('s1', { status: 'active', messageCount: 5 }));
      useSessionsStore.getState().updateSession('s1', { status: 'completed', messageCount: 10 });
      const session = useSessionsStore.getState().sessions.get('s1')!;
      expect(session.status).toBe('completed');
      expect(session.messageCount).toBe(10);
      expect(session.agentId).toBe('agent-1'); // unchanged
    });

    it('does nothing when updating a non-existent session', () => {
      useSessionsStore.getState().updateSession('nonexistent', { status: 'completed' });
      expect(useSessionsStore.getState().sessions.size).toBe(0);
    });
  });

  describe('setQueue', () => {
    it('sets the queue items', () => {
      const queue: QueueItem[] = [
        {
          id: 'q1',
          sessionId: 's1',
          type: 'message',
          priority: 1,
          status: 'pending',
          createdAt: Date.now(),
        },
      ];
      useSessionsStore.getState().setQueue(queue);
      expect(useSessionsStore.getState().queue).toHaveLength(1);
      expect(useSessionsStore.getState().queue[0].id).toBe('q1');
    });

    it('replaces the entire queue', () => {
      useSessionsStore.getState().setQueue([
        { id: 'q1', sessionId: 's1', type: 'msg', priority: 1, status: 'pending', createdAt: 1 },
      ]);
      useSessionsStore.getState().setQueue([
        { id: 'q2', sessionId: 's2', type: 'msg', priority: 2, status: 'processing', createdAt: 2 },
      ]);
      expect(useSessionsStore.getState().queue).toHaveLength(1);
      expect(useSessionsStore.getState().queue[0].id).toBe('q2');
    });
  });

  describe('setActiveSessionId', () => {
    it('sets the active session id', () => {
      useSessionsStore.getState().setActiveSessionId('s1');
      expect(useSessionsStore.getState().activeSessionId).toBe('s1');
    });

    it('clears the active session id with null', () => {
      useSessionsStore.getState().setActiveSessionId('s1');
      useSessionsStore.getState().setActiveSessionId(null);
      expect(useSessionsStore.getState().activeSessionId).toBeNull();
    });
  });

  describe('getSessions', () => {
    it('returns an array of all sessions', () => {
      useSessionsStore.getState().setSession(makeSession('s1'));
      useSessionsStore.getState().setSession(makeSession('s2'));
      const sessions = useSessionsStore.getState().getSessions();
      expect(sessions).toHaveLength(2);
      const ids = sessions.map((s) => s.id);
      expect(ids).toContain('s1');
      expect(ids).toContain('s2');
    });

    it('returns empty array when no sessions exist', () => {
      expect(useSessionsStore.getState().getSessions()).toEqual([]);
    });
  });

  describe('getActiveSessions', () => {
    it('returns only sessions with status "active"', () => {
      useSessionsStore.getState().setSession(makeSession('s1', { status: 'active' }));
      useSessionsStore.getState().setSession(makeSession('s2', { status: 'completed' }));
      useSessionsStore.getState().setSession(makeSession('s3', { status: 'active' }));
      useSessionsStore.getState().setSession(makeSession('s4', { status: 'error' }));

      const active = useSessionsStore.getState().getActiveSessions();
      expect(active).toHaveLength(2);
      const ids = active.map((s) => s.id);
      expect(ids).toContain('s1');
      expect(ids).toContain('s3');
    });

    it('returns empty array when no active sessions exist', () => {
      useSessionsStore.getState().setSession(makeSession('s1', { status: 'completed' }));
      expect(useSessionsStore.getState().getActiveSessions()).toEqual([]);
    });
  });
});
