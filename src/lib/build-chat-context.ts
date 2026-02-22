import { useConnectionStore } from '@/stores/connection-store';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { useAgentsStore } from '@/stores/agents-store';
import { useSessionsStore } from '@/stores/sessions-store';
import { useEventsStore } from '@/stores/events-store';
import { useCostStore } from '@/stores/cost-store';
import { formatTokenCount, formatCost } from '@/lib/formatters';

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Gathers current dashboard state from all Zustand stores (via getState())
 * and returns a structured markdown string for injecting into the chat
 * system prompt as live dashboard context.
 *
 * This context enables the AI assistant to answer questions about:
 * - Connection status and gateway health
 * - Active/total sessions and their details
 * - Agent roster with status breakdown
 * - Recent errors and warnings
 * - Cost and token usage summaries
 * - System presence and channel information
 * - Queue state
 */
export function buildDashboardContext(): string {
  const connectionState = useConnectionStore.getState();
  const gatewayData = useGatewayDataStore.getState();
  const agentsState = useAgentsStore.getState();
  const sessionsState = useSessionsStore.getState();
  const eventsState = useEventsStore.getState();
  const costState = useCostStore.getState();

  const sections: string[] = [];

  // --- Header with timestamp ---
  sections.push(
    `## Live Dashboard Snapshot\n_Updated: ${new Date().toLocaleString()}_`,
  );

  // --- Connection Status ---
  const status = connectionState.status;
  const lastConnected = connectionState.lastConnectedAt
    ? formatTimestamp(connectionState.lastConnectedAt)
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
    const healthStatus = health.ok ? 'OK (healthy)' : 'DEGRADED';
    const lines = [
      `- Health: **${healthStatus}**`,
      `- Uptime: ${uptimeStr}`,
      `- Latency: ${latencyStr}`,
    ];
    if (server) {
      lines.push(`- Version: ${server.version}`);
      lines.push(`- Host: ${server.host}`);
    }
    lines.push(`- Gateway sessions tracked: ${health.sessions.count}`);
    if (health.agents.length > 0) {
      const agentSummaries = health.agents.map((a) => {
        const defaultTag = a.isDefault ? ' (default)' : '';
        return `${a.agentId}${defaultTag}: ${a.sessions.count} sessions`;
      });
      lines.push(`- Gateway agents: ${agentSummaries.join(', ')}`);
    }
    sections.push(`### Gateway\n${lines.join('\n')}`);

    // Channels from health data
    if (health.channelOrder.length > 0) {
      const channelLines = health.channelOrder.map((key) => {
        const ch = health.channels[key];
        if (!ch) return `- ${key}: unknown`;
        const statusStr = ch.running
          ? 'running'
          : ch.configured
            ? 'configured (stopped)'
            : 'not configured';
        const botInfo =
          ch.probe?.bot?.username ? ` (bot: @${ch.probe.bot.username})` : '';
        return `- ${ch.label}: ${statusStr}${botInfo}`;
      });
      sections.push(`### Channels\n${channelLines.join('\n')}`);
    }
  } else {
    sections.push(
      `### Gateway\n- No health data available (gateway disconnected)`,
    );
  }

  // --- System Presence ---
  const presence = gatewayData.presence;
  if (presence.length > 0) {
    const presenceLines = presence.slice(0, 5).map((p) => {
      const time = formatTimestamp(p.ts);
      const parts = [`host=${p.host}`, `reason=${p.reason}`];
      if (p.version) parts.push(`version=${p.version}`);
      if (p.platform) parts.push(`platform=${p.platform}`);
      if (p.mode) parts.push(`mode=${p.mode}`);
      return `- [${time}] ${parts.join(', ')}`;
    });
    sections.push(
      `### System Presence (${presence.length} entries)\n${presenceLines.join('\n')}`,
    );
  }

  // --- Agents ---
  const agents = Array.from(agentsState.agents.values());
  if (agents.length > 0) {
    // Status breakdown
    const statusCounts: Record<string, number> = {};
    for (const a of agents) {
      statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
    }
    const statusSummary = Object.entries(statusCounts)
      .map(([s, c]) => `${s}: ${c}`)
      .join(', ');

    const agentLines = agents.slice(0, 10).map((a) => {
      const phase = a.currentPhase ? ` (phase: ${a.currentPhase})` : '';
      return `- **${a.name}** [${a.id}]: status=${a.status}${phase}, model=${a.model}, sessions=${a.stats.totalSessions}, tokens=${formatTokenCount(a.stats.totalTokens)}, cost=${formatCost(a.stats.totalCost)}`;
    });
    const moreNote =
      agents.length > 10 ? `\n- _(${agents.length - 10} more agents not shown)_` : '';
    sections.push(
      `### Agents (${agents.length} total — ${statusSummary})\n${agentLines.join('\n')}${moreNote}`,
    );
  } else {
    sections.push(`### Agents\n- No agents registered`);
  }

  // --- Sessions ---
  const allSessions = Array.from(sessionsState.sessions.values());
  const activeSessions = allSessions.filter((s) => s.status === 'active');
  const errorSessions = allSessions.filter((s) => s.status === 'error');
  const completedSessions = allSessions.filter((s) => s.status === 'completed');

  const sessionStatusLine = `Active: ${activeSessions.length}, Completed: ${completedSessions.length}, Errors: ${errorSessions.length}, Total: ${allSessions.length}`;

  if (activeSessions.length > 0) {
    const sessionLines = activeSessions.slice(0, 8).map((s) => {
      const duration = Math.floor((Date.now() - s.startedAt) / 1000);
      const durationStr =
        duration > 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`;
      return `- **${s.id}**: agent=${s.agentName}, channel=${s.channel}, model=${s.model}, duration=${durationStr}, tokens=${formatTokenCount(s.tokenUsage.total)} (prompt: ${formatTokenCount(s.tokenUsage.prompt)}, completion: ${formatTokenCount(s.tokenUsage.completion)}), messages=${s.messageCount}, tools=${s.toolCallCount}, cost=${formatCost(s.cost)}`;
    });
    const moreNote =
      activeSessions.length > 8
        ? `\n- _(${activeSessions.length - 8} more active sessions not shown)_`
        : '';
    sections.push(
      `### Sessions (${sessionStatusLine})\n${sessionLines.join('\n')}${moreNote}`,
    );
  } else {
    sections.push(`### Sessions (${sessionStatusLine})\n- No active sessions`);
  }

  // --- Queue ---
  const queue = sessionsState.queue;
  if (queue.length > 0) {
    const queueByStatus: Record<string, number> = {};
    for (const item of queue) {
      queueByStatus[item.status] = (queueByStatus[item.status] ?? 0) + 1;
    }
    const queueSummary = Object.entries(queueByStatus)
      .map(([s, c]) => `${s}: ${c}`)
      .join(', ');
    sections.push(
      `### Queue (${queue.length} items)\n- Breakdown: ${queueSummary}`,
    );
  }

  // --- Cost Summary ---
  const { dailyCost, dailyTokens, costByAgent, costByModel } = costState;
  const costLines = [
    `- Daily cost: **${formatCost(dailyCost)}**`,
    `- Daily tokens: **${formatTokenCount(dailyTokens)}**`,
  ];

  if (costByModel.length > 0) {
    const modelLines = costByModel.map(
      (m) =>
        `  - ${m.model}: ${formatCost(m.totalCost)} (${formatTokenCount(m.totalTokens)} tokens — prompt: ${formatTokenCount(m.promptTokens)}, completion: ${formatTokenCount(m.completionTokens)}, ${m.sessionCount} sessions)`,
    );
    costLines.push(`- Cost by model:\n${modelLines.join('\n')}`);
  }

  if (costByAgent.length > 0) {
    const agentCostLines = costByAgent.slice(0, 5).map(
      (a) =>
        `  - ${a.agentName}: ${formatCost(a.totalCost)} (${formatTokenCount(a.totalTokens)} tokens, ${a.sessionCount} sessions)`,
    );
    costLines.push(`- Cost by agent:\n${agentCostLines.join('\n')}`);
  }

  sections.push(`### Cost & Token Usage (Today)\n${costLines.join('\n')}`);

  // --- Recent Errors ---
  const errorEntries = eventsState.entries
    .filter((e) => e.severity === 'error' || e.severity === 'warning')
    .slice(-10);
  if (errorEntries.length > 0) {
    const errorLines = errorEntries.map((e) => {
      const time = formatTimestamp(e.timestamp);
      const sessionTag = e.sessionId ? ` session=${e.sessionId}` : '';
      const agentTag = e.agentId ? ` agent=${e.agentId}` : '';
      return `- [${e.severity.toUpperCase()}] ${time}: ${e.message}${agentTag}${sessionTag}`;
    });
    sections.push(`### Recent Errors & Warnings (last ${errorEntries.length})\n${errorLines.join('\n')}`);
  } else {
    sections.push(`### Recent Errors & Warnings\n- No errors or warnings recorded`);
  }

  // --- Recent Activity Summary ---
  const totalEvents = eventsState.entries.length;
  if (totalEvents > 0) {
    const lastEvent = eventsState.entries[totalEvents - 1];
    const severityCounts: Record<string, number> = {};
    // Count severity of last 100 events for a quick summary
    const recentSlice = eventsState.entries.slice(-100);
    for (const e of recentSlice) {
      severityCounts[e.severity] = (severityCounts[e.severity] ?? 0) + 1;
    }
    const severitySummary = Object.entries(severityCounts)
      .map(([s, c]) => `${s}: ${c}`)
      .join(', ');
    sections.push(
      `### Event Log Summary\n- Total events in buffer: ${totalEvents}\n- Last 100 events by severity: ${severitySummary}\n- Most recent event: [${lastEvent.severity.toUpperCase()}] ${formatTimestamp(lastEvent.timestamp)} — ${lastEvent.message}`,
    );
  }

  return sections.join('\n\n');
}
