'use client';

import { useState, useCallback } from 'react';
import { authFetch } from '@/lib/dashboard-auth-client';
import { getCodeMonitorBaseUrl } from '@/lib/code-monitor/url';

export function useCodeMonitorActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCommand = useCallback(async (machineId: string, instruction: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${getCodeMonitorBaseUrl()}/api/code-monitor/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineId, instruction }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send command');
      }
      const data = await res.json();
      return data.commandId;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendCommand, isLoading, error };
}
