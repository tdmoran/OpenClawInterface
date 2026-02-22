'use client';

import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';
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
  retryConnection: () => void;
}

const GatewayContext = createContext<GatewayContextValue>({
  client: null,
  connect: () => {},
  disconnect: () => {},
  retryConnection: () => {},
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

/** Tracks the previous status so we can detect transitions. */
let prevStatus: ConnectionStatus = 'disconnected';

function showConnectionToasts(
  status: ConnectionStatus,
  client: GatewayClient,
  retryFn: () => void,
) {
  // Avoid duplicate toasts on same-status re-fires
  if (status === prevStatus) return;
  const prev = prevStatus;
  prevStatus = status;

  switch (status) {
    case 'connected':
      // Only show success toast when recovering from a non-initial state
      if (prev === 'reconnecting' || prev === 'error' || prev === 'connecting') {
        toast.dismiss('gateway-reconnecting');
        toast.success('Gateway connected', {
          description: 'Connection to the gateway has been established.',
          duration: 3000,
        });
      }
      break;

    case 'reconnecting': {
      const attempt = client.getReconnectAttempts();
      const max = client.getMaxReconnectAttempts();
      toast.loading(`Reconnecting to gateway... (${attempt + 1}/${max})`, {
        id: 'gateway-reconnecting',
        description: 'Attempting to restore the connection.',
        duration: Infinity,
      });
      break;
    }

    case 'error':
      toast.dismiss('gateway-reconnecting');
      if (prev === 'reconnecting' || prev === 'connecting') {
        // Max retries exhausted
        toast.error('Gateway connection failed', {
          description: 'All reconnection attempts have been exhausted.',
          duration: 10000,
          action: {
            label: 'Retry',
            onClick: retryFn,
          },
        });
      } else if (prev === 'connected') {
        toast.error('Connection lost', {
          description: 'The gateway connection was interrupted.',
          duration: 5000,
        });
      }
      break;

    case 'disconnected':
      toast.dismiss('gateway-reconnecting');
      if (prev === 'connected') {
        toast.info('Disconnected from gateway', {
          description: 'You have been disconnected.',
          duration: 3000,
        });
      }
      break;
  }
}

export function GatewayProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<GatewayClient | null>(null);
  const { config, setStatus, setLastConnectedAt } = useConnectionStore();
  const { addEntry } = useEventsStore();
  const { setSession, updateSession } = useSessionsStore();
  const { setAgent, updateAgent } = useAgentsStore();

  const retryConnection = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    client.resetReconnectAttempts();
    client.disconnect();
    // Small delay to allow WebSocket cleanup before reconnecting
    setTimeout(() => {
      client.connect();
    }, 100);
  }, []);

  useEffect(() => {
    // Reset the singleton so we get a fresh client for the new config
    GatewayClient.resetInstance();
    const client = GatewayClient.getInstance(config);
    clientRef.current = client;

    // Reset the toast status tracker on fresh mount
    prevStatus = 'disconnected';

    const unsubStatus = client.onStatusChange((status: ConnectionStatus) => {
      setStatus(status);
      if (status === 'connected') {
        setLastConnectedAt(Date.now());
      }
      showConnectionToasts(status, client, retryConnection);
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
  }, [config, setStatus, setLastConnectedAt, addEntry, setSession, updateSession, setAgent, updateAgent, retryConnection]);

  const connect = () => clientRef.current?.connect();
  const disconnect = () => clientRef.current?.disconnect();

  return (
    <GatewayContext.Provider value={{ client: clientRef.current, connect, disconnect, retryConnection }}>
      {children}
    </GatewayContext.Provider>
  );
}
