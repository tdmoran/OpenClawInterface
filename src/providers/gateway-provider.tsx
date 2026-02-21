'use client';

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { GatewayClient } from '@/lib/gateway';
import { useConnectionStore } from '@/stores/connection-store';
import { useEventsStore } from '@/stores/events-store';
import { useSessionsStore } from '@/stores/sessions-store';
import { useAgentsStore } from '@/stores/agents-store';
import type { GatewayEvent, ConnectionStatus, EventSeverity } from '@/types/gateway';
import type { LogEntry } from '@/types/events';
import type { Session } from '@/types/session';
import type { Agent } from '@/types/agent';

interface GatewayContextValue {
  client: GatewayClient | null;
  connect: () => void;
  disconnect: () => void;
}

const GatewayContext = createContext<GatewayContextValue>({
  client: null,
  connect: () => {},
  disconnect: () => {},
});

export function useGatewayContext() {
  return useContext(GatewayContext);
}

function eventToLogEntry(event: GatewayEvent): LogEntry {
  const severityMap: Record<string, EventSeverity> = {
    error: 'error',
    warning: 'warning',
    debug: 'debug',
  };
  const severity = event.type.includes('error')
    ? 'error'
    : severityMap[event.data?.severity as string] || 'info';

  return {
    id: event.id,
    timestamp: event.timestamp,
    type: event.type,
    severity,
    sessionId: event.sessionId,
    agentId: event.agentId,
    message: (event.data?.message as string) || `${event.type}`,
    data: event.data,
  };
}

export function GatewayProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<GatewayClient | null>(null);
  const { config, setStatus, setLastConnectedAt } = useConnectionStore();
  const { addEntry } = useEventsStore();
  const { setSession, updateSession } = useSessionsStore();
  const { setAgent, updateAgent } = useAgentsStore();

  useEffect(() => {
    const client = GatewayClient.getInstance(config);
    clientRef.current = client;

    const unsubStatus = client.onStatusChange((status: ConnectionStatus) => {
      setStatus(status);
      if (status === 'connected') {
        setLastConnectedAt(Date.now());
      }
    });

    // Auto-connect on mount
    client.connect();

    const unsubEvents = client.onEvent((event: GatewayEvent) => {
      addEntry(eventToLogEntry(event));

      switch (event.type) {
        case 'session.started':
          setSession(event.data as unknown as Session);
          break;
        case 'session.ended':
          if (event.sessionId) {
            updateSession(event.sessionId, { status: 'completed', endedAt: Date.now() });
          }
          break;
        case 'session.error':
          if (event.sessionId) {
            updateSession(event.sessionId, { status: 'error' });
          }
          break;
        case 'agent.phase_change':
          if (event.agentId) {
            updateAgent(event.agentId, {
              currentPhase: event.data?.phase as Agent['currentPhase'],
              status: 'thinking',
            });
          }
          break;
        case 'agent.tool_call':
          if (event.agentId) {
            updateAgent(event.agentId, { status: 'tool_calling' });
          }
          break;
        case 'agent.responding':
          if (event.agentId) {
            updateAgent(event.agentId, { status: 'responding' });
          }
          break;
      }
    });

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, [config, setStatus, setLastConnectedAt, addEntry, setSession, updateSession, setAgent, updateAgent]);

  const connect = () => clientRef.current?.connect();
  const disconnect = () => clientRef.current?.disconnect();

  return (
    <GatewayContext.Provider value={{ client: clientRef.current, connect, disconnect }}>
      {children}
    </GatewayContext.Provider>
  );
}
