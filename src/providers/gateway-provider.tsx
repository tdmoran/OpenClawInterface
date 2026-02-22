'use client';

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { GatewayClient } from '@/lib/gateway';
import { useConnectionStore } from '@/stores/connection-store';
import { useEventsStore } from '@/stores/events-store';
import { useSessionsStore } from '@/stores/sessions-store';
import { useAgentsStore } from '@/stores/agents-store';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
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
  const dataSeverity = typeof event.data?.severity === 'string' ? event.data.severity : '';
  const severity: EventSeverity = event.type.includes('error')
    ? 'error'
    : severityMap[dataSeverity] ?? 'info';

  const message = typeof event.data?.message === 'string' ? event.data.message : event.type;

  return {
    id: event.id,
    timestamp: event.timestamp,
    type: event.type,
    severity,
    sessionId: event.sessionId,
    agentId: event.agentId,
    message,
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

    // Subscribe to the connect payload to capture the initial snapshot
    const { setSnapshot, updateHealth, updatePresence } = useGatewayDataStore.getState();

    const unsubPayload = client.onConnectPayload((payload) => {
      setSnapshot(payload);
    });

    const unsubEvents = client.onEvent((event: GatewayEvent) => {
      addEntry(eventToLogEntry(event));

      switch (event.type) {
        case 'session.started': {
          const data = event.data as Record<string, unknown>;
          const session: Session = {
            id: String(data.id ?? ''),
            agentId: String(data.agentId ?? ''),
            agentName: String(data.agentName ?? ''),
            channel: String(data.channel ?? ''),
            status: (data.status as Session['status']) ?? 'active',
            model: String(data.model ?? ''),
            startedAt: Number(data.startedAt ?? Date.now()),
            endedAt: data.endedAt != null ? Number(data.endedAt) : undefined,
            tokenUsage: (data.tokenUsage as Session['tokenUsage']) ?? { prompt: 0, completion: 0, total: 0 },
            cost: Number(data.cost ?? 0),
            messageCount: Number(data.messageCount ?? 0),
            toolCallCount: Number(data.toolCallCount ?? 0),
            traces: (data.traces as Session['traces']) ?? [],
          };
          setSession(session);
          break;
        }
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
            const phase = typeof event.data?.phase === 'string'
              ? event.data.phase as Agent['currentPhase']
              : undefined;
            updateAgent(event.agentId, {
              currentPhase: phase,
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
        case 'health':
          updateHealth(event.data);
          break;
        case 'presence': {
          const presenceData = Array.isArray(event.data?.presence)
            ? event.data.presence as Record<string, unknown>[]
            : [];
          updatePresence(presenceData);
          break;
        }
      }
    });

    return () => {
      unsubStatus();
      unsubPayload();
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
