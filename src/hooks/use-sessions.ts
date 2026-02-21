'use client';

import { useSessionsStore } from '@/stores/sessions-store';

export function useSessions() {
  const sessions = useSessionsStore((s) => s.getSessions());
  const activeSessions = useSessionsStore((s) => s.getActiveSessions());
  const queue = useSessionsStore((s) => s.queue);
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const setActiveSessionId = useSessionsStore((s) => s.setActiveSessionId);

  return {
    sessions,
    activeSessions,
    queue,
    activeSessionId,
    setActiveSessionId,
  };
}
