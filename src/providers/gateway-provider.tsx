'use client';

import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';
import { GatewayClient } from '@/lib/gateway';
import { useConnectionStore } from '@/stores/connection-store';
import { useEventsStore } from '@/stores/events-store';
import { useSessionsStore } from '@/stores/sessions-store';
import { useAgentsStore } from '@/stores/agents-store';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { useCostStore } from '@/stores/cost-store';
import type { GatewayEvent, ConnectionStatus, EventSeverity } from '@/types/gateway';
import type { LogEntry } from '@/types/events';
import type { Session, Trace } from '@/types/session';
import type { Agent } from '@/types/agent';
import type { AgentCostEntry, ModelCostEntry } from '@/lib/cost-utils';
import type { GatewayConfig } from '@/types/gateway';

/**
 * When the dashboard is accessed over LAN (e.g. 192.168.x.x) but the gateway
 * URL still points to localhost, rewrite it to use the browser's hostname so
 * the WebSocket connection reaches the correct machine.
 */
function resolveGatewayUrl(config: GatewayConfig): GatewayConfig {
  if (typeof window === 'undefined') return config;
  const browserHost = window.location.hostname;
  const isLocalBrowser = browserHost === 'localhost' || browserHost === '127.0.0.1' || browserHost === '::1';
  if (isLocalBrowser) return config;

  try {
    const url = new URL(config.url);
    const isLocalGateway = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
    if (!isLocalGateway) return config;
    // The gateway only listens on localhost, so LAN / ngrok clients can't
    // reach it directly. Route through the Next.js proxy at /gateway-ws.
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const proxyUrl = `${protocol}//${window.location.host}/gateway-ws`;
    return { ...config, url: proxyUrl };
  } catch {
    return config;
  }
}

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
  const { addEntry, clear: clearEvents } = useEventsStore();
  const { setSession, updateSession, clearSessions } = useSessionsStore();
  const { setAgent, updateAgent, clearAgents } = useAgentsStore();

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
    const resolvedConfig = resolveGatewayUrl(config);
    const client = GatewayClient.getInstance(resolvedConfig);
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
    const { setSnapshot, updateHealth, updatePresence, setLastEventAt } = useGatewayDataStore.getState();

    const unsubPayload = client.onConnectPayload((payload) => {
      // Clear stale persisted data on fresh connection so the UI
      // only shows live data from the gateway, not cached localStorage data.
      clearSessions();
      clearAgents();
      clearEvents();
      setSnapshot(payload);
    });

    const unsubEvents = client.onEvent((event: GatewayEvent) => {
      addEntry(eventToLogEntry(event));

      // Track the timestamp of every incoming event
      setLastEventAt(event.timestamp || Date.now());

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

        // --- Token usage updates for a running session ---
        case 'session.token_update': {
          if (event.sessionId) {
            const data = event.data;
            const promptTokens = typeof data?.prompt_tokens === 'number' ? data.prompt_tokens : 0;
            const completionTokens = typeof data?.completion_tokens === 'number' ? data.completion_tokens : 0;
            const total = promptTokens + completionTokens;
            updateSession(event.sessionId, {
              tokenUsage: { prompt: promptTokens, completion: completionTokens, total },
            });
          }
          break;
        }

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

        // --- Agent tool call: update agent status + add trace to session ---
        case 'agent.tool_call': {
          if (event.agentId) {
            updateAgent(event.agentId, { status: 'tool_calling' });
          }
          // Append a tool_call trace to the session if a sessionId is present
          if (event.sessionId) {
            const data = event.data;
            const toolName = typeof data?.toolName === 'string' ? data.toolName : 'unknown';
            const trace: Trace = {
              id: event.id,
              sessionId: event.sessionId,
              type: 'tool_call',
              timestamp: event.timestamp,
              data: {
                toolName,
                toolInput: typeof data?.toolInput === 'object' && data.toolInput !== null
                  ? data.toolInput as Record<string, unknown>
                  : undefined,
              },
            };
            const existing = useSessionsStore.getState().sessions.get(event.sessionId);
            if (existing) {
              updateSession(event.sessionId, {
                traces: [...existing.traces, trace],
              });
            }
          }
          break;
        }

        case 'agent.responding':
          if (event.agentId) {
            updateAgent(event.agentId, { status: 'responding' });
          }
          break;

        // --- Tool result: increment tool call count on the session ---
        case 'tool.result': {
          if (event.sessionId) {
            const existing = useSessionsStore.getState().sessions.get(event.sessionId);
            if (existing) {
              updateSession(event.sessionId, {
                toolCallCount: existing.toolCallCount + 1,
              });
            }
          }
          break;
        }

        // --- Cost updated: authoritative cost data from the gateway ---
        case 'cost.updated': {
          const data = event.data;
          const dailyCost = typeof data?.dailyCost === 'number' ? data.dailyCost : 0;
          const dailyTokens = typeof data?.dailyTokens === 'number' ? data.dailyTokens : 0;
          const costByModel = Array.isArray(data?.costByModel)
            ? (data.costByModel as unknown[]).filter(
                (entry): entry is ModelCostEntry =>
                  typeof entry === 'object' &&
                  entry !== null &&
                  typeof (entry as Record<string, unknown>).model === 'string' &&
                  typeof (entry as Record<string, unknown>).totalCost === 'number',
              )
            : [];
          const costByAgent = Array.isArray(data?.costByAgent)
            ? (data.costByAgent as unknown[]).filter(
                (entry): entry is AgentCostEntry =>
                  typeof entry === 'object' &&
                  entry !== null &&
                  typeof (entry as Record<string, unknown>).agentId === 'string' &&
                  typeof (entry as Record<string, unknown>).totalCost === 'number',
              )
            : [];

          useCostStore.getState().setCostData({ dailyCost, dailyTokens, costByAgent, costByModel });
          break;
        }

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
  }, [config, setStatus, setLastConnectedAt, addEntry, setSession, updateSession, setAgent, updateAgent, retryConnection, clearSessions, clearAgents, clearEvents]);

  const connect = () => clientRef.current?.connect();
  const disconnect = () => clientRef.current?.disconnect();

  return (
    <GatewayContext.Provider value={{ client: clientRef.current, connect, disconnect, retryConnection }}>
      {children}
    </GatewayContext.Provider>
  );
}
