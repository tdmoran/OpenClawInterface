import { create } from 'zustand';
import type { Session, QueueItem } from '@/types/session';

interface SessionsState {
  sessions: Map<string, Session>;
  queue: QueueItem[];
  activeSessionId: string | null;
  setSession: (session: Session) => void;
  removeSession: (id: string) => void;
  updateSession: (id: string, update: Partial<Session>) => void;
  setQueue: (queue: QueueItem[]) => void;
  setActiveSessionId: (id: string | null) => void;
  getSessions: () => Session[];
  getActiveSessions: () => Session[];
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: new Map(),
  queue: [],
  activeSessionId: null,
  setSession: (session) =>
    set((state) => {
      const sessions = new Map(state.sessions);
      sessions.set(session.id, session);
      return { sessions };
    }),
  removeSession: (id) =>
    set((state) => {
      const sessions = new Map(state.sessions);
      sessions.delete(id);
      return { sessions };
    }),
  updateSession: (id, update) =>
    set((state) => {
      const sessions = new Map(state.sessions);
      const existing = sessions.get(id);
      if (existing) {
        sessions.set(id, { ...existing, ...update });
      }
      return { sessions };
    }),
  setQueue: (queue) => set({ queue }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  getSessions: () => Array.from(get().sessions.values()),
  getActiveSessions: () =>
    Array.from(get().sessions.values()).filter((s) => s.status === 'active'),
}));
