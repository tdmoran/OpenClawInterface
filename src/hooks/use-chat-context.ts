'use client';

import { useCallback } from 'react';
import { useConnectionStore } from '@/stores/connection-store';
import { buildDashboardContext } from '@/lib/build-chat-context';

/**
 * Hook that provides access to the current dashboard context for chat.
 *
 * Returns:
 * - `getContext()` — calls buildDashboardContext() to gather live state
 * - `isLive` — whether the gateway is currently connected
 */
export function useChatContext() {
  const status = useConnectionStore((s) => s.status);
  const isLive = status === 'connected';

  const getContext = useCallback(() => {
    return buildDashboardContext();
  }, []);

  return { getContext, isLive };
}
