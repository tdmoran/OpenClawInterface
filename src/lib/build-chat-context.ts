import { useConnectionStore } from '@/stores/connection-store';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { useAgentsStore } from '@/stores/agents-store';
import { useSessionsStore } from '@/stores/sessions-store';
import { useEventsStore } from '@/stores/events-store';

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

/**
 * Gathers current dashboard state from all Zustand stores (via getState())
 * and returns a concise markdown string (~1500 tokens max) for injecting
 * into the chat system prompt as live dashboard context.
 */
export function buildDashboardContext(): string {
  const connectionState = useConnectionStore.getState();
  const gatewayData = useGatewayDataStore.getState();
  const agentsState = useAgentsStore.getState();
  const sessionsState = useSessionsStore.getState();
  const eventsState = useEventsStore.getState();

  const sections: string[] = [];

  // --- Connection Status ---
  const status = connectionState.status;
  const lastConnected = connectionState.lastConnectedAt
    ? new Date(connectionState.lastConnectedAt).toLocaleTimeString()
    : 'never';
  sections.push(
    `### Connection\n- Status: **${status}**\n- Last connected: ${lastConnected}${connectionState.error ? `\n- Error: ${connectionState.error}` : ''}`,
  );

  // --- Gateway Health ---
  const health = gatewayData.health;
  const server = gatewayData.server;
  if (health) {
    const uptimeStr = formatUptime(health.uptimeMs);
    const latencyStr = `${health.durationMs}ms`;
    sections.push(
      `### Gateway\n- Health: ${health.ok ? 'OK' : 'DEGRADED'}\n- Uptime: ${uptimeStr}\n- Latency: ${latencyStr}${server ? `\n- Version: ${server.version}` : ''}\n- Sessions tracked: ${health.sessions.count}`,
    );

    // Channels from health data
    if (health.channelOrder.length > 0) {
      const channelLines = health.channelOrder.map((key) => {
        const ch = health.channels[key];
        if (!ch) return `- ${key}: unknown`;
        const statusStr = ch.running ? 'running' : ch.configured ? 'configured (stopped)' : 'not configured';
        return `- ${ch.label}: ${statusStr}`;
      });
      sections.push(`### Channels\n${channelLines.join('\n')}`);
    }
  } else {
    sections.push(`### Gateway\n- No health data available (gateway disconnected)`);
  }

  // --- Agents ---
  const agents = Array.from(agentsState.agents.values());
  if (agents.length > 0) {
    const agentLines = agents.slice(0, 10).map((a) => {
      const phase = a.currentPhase ? ` (${a.currentPhase})` : '';
      return `- **${a.name}** [${a.id}]: ${a.status}${phase}, model=${a.model}, sessions=${a.stats.totalSessions}, tokens=${formatTokens(a.stats.totalTokens)}`;
    });
    sections.push(`### Agents (${agents.length})\n${agentLines.join('\n')}`);
  } else {
    sections.push(`### Agents\n- No agents registered`);
  }

  // --- Active Sessions ---
  const allSessions = Array.from(sessionsState.sessions.values());
  const activeSessions = allSessions.filter((s) => s.status === 'active');
  if (activeSessions.length > 0) {
    const sessionLines = activeSessions.slice(0, 8).map((s) => {
      const duration = Math.floor((Date.now() - s.startedAt) / 1000);
      const durationStr = duration > 60 ? `${Math.floor(duration / 60)}m` : `${duration}s`;
      return `- **${s.id}**: agent=${s.agentName}, channel=${s.channel}, duration=${durationStr}, tokens=${formatTokens(s.tokenUsage.total)}, messages=${s.messageCount}`;
    });
    sections.push(
      `### Active Sessions (${activeSessions.length}/${allSessions.length} total)\n${sessionLines.join('\n')}`,
    );
  } else {
    sections.push(
      `### Sessions\n- No active sessions (${allSessions.length} total)`,
    );
  }

  // --- Recent Errors ---
  const errorEntries = eventsState.entries
    .filter((e) => e.severity === 'error' || e.severity === 'warning')
    .slice(-5);
  if (errorEntries.length > 0) {
    const errorLines = errorEntries.map((e) => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      return `- [${e.severity.toUpperCase()}] ${time}: ${e.message}${e.agentId ? ` (agent: ${e.agentId})` : ''}`;
    });
    sections.push(`### Recent Errors/Warnings\n${errorLines.join('\n')}`);
  }

  return sections.join('\n\n');
}
