'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useSessionsStore } from '@/stores/sessions-store';
import { useMounted } from '@/hooks/use-mounted';
import {
  Timer,
  Zap,
  BarChart3,
  Activity,
  PieChart as PieChartIcon,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Session, SessionStatus } from '@/types/session';

interface AgentPerformanceProps {
  agentId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function formatMs(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

const STATUS_COLORS: Record<SessionStatus, string> = {
  completed: 'hsl(var(--chart-1))',
  error: 'hsl(var(--chart-4))',
  timeout: 'hsl(var(--chart-3))',
  active: 'hsl(var(--chart-2))',
};

const STATUS_LABELS: Record<SessionStatus, string> = {
  completed: 'Completed',
  error: 'Error',
  timeout: 'Timeout',
  active: 'Active',
};

// ── Component ────────────────────────────────────────────────────────

export function AgentPerformance({ agentId }: AgentPerformanceProps) {
  const mounted = useMounted();
  const sessions = useSessionsStore((s) => s.getSessions());

  const agentSessions = useMemo(
    () => sessions.filter((s) => s.agentId === agentId),
    [sessions, agentId],
  );

  // ── Response Time Stats ──────────────────────────────────────────

  const responseTimeStats = useMemo(() => {
    const durations = agentSessions
      .filter((s) => s.endedAt && s.startedAt)
      .map((s) => s.endedAt! - s.startedAt)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return { avg: 0, p50: 0, p95: 0, p99: 0, count: 0 };
    }

    const sum = durations.reduce((a, b) => a + b, 0);
    return {
      avg: sum / durations.length,
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      count: durations.length,
    };
  }, [agentSessions]);

  // ── Token Efficiency ─────────────────────────────────────────────

  const tokenStats = useMemo(() => {
    if (agentSessions.length === 0) {
      return { avgTotal: 0, avgPrompt: 0, avgCompletion: 0, ratio: 0 };
    }
    const totals = agentSessions.map((s) => s.tokenUsage.total);
    const prompts = agentSessions.map((s) => s.tokenUsage.prompt);
    const completions = agentSessions.map((s) => s.tokenUsage.completion);

    const sumP = prompts.reduce((a, b) => a + b, 0);
    const sumC = completions.reduce((a, b) => a + b, 0);

    return {
      avgTotal: totals.reduce((a, b) => a + b, 0) / agentSessions.length,
      avgPrompt: sumP / agentSessions.length,
      avgCompletion: sumC / agentSessions.length,
      ratio: sumC > 0 ? sumP / sumC : 0,
    };
  }, [agentSessions]);

  // ── Session Volume Over Time (last 24h, per hour) ────────────────

  const volumeData = useMemo(() => {
    const now = Date.now();
    const hours24 = 24 * 60 * 60 * 1000;
    const startTime = now - hours24;

    // Initialise buckets for each hour
    const buckets: { time: string; count: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const ts = new Date(startTime + i * 60 * 60 * 1000);
      buckets.push({
        time: `${ts.getHours().toString().padStart(2, '0')}:00`,
        count: 0,
      });
    }

    agentSessions
      .filter((s) => s.startedAt >= startTime)
      .forEach((s) => {
        const hourIdx = Math.floor((s.startedAt - startTime) / (60 * 60 * 1000));
        if (hourIdx >= 0 && hourIdx < 24) {
          buckets[hourIdx].count += 1;
        }
      });

    return buckets;
  }, [agentSessions]);

  // ── Token Usage Over Time (last 24h, per hour) ───────────────────

  const tokenOverTime = useMemo(() => {
    const now = Date.now();
    const hours24 = 24 * 60 * 60 * 1000;
    const startTime = now - hours24;

    const buckets: { time: string; prompt: number; completion: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const ts = new Date(startTime + i * 60 * 60 * 1000);
      buckets.push({
        time: `${ts.getHours().toString().padStart(2, '0')}:00`,
        prompt: 0,
        completion: 0,
      });
    }

    agentSessions
      .filter((s) => s.startedAt >= startTime)
      .forEach((s) => {
        const hourIdx = Math.floor((s.startedAt - startTime) / (60 * 60 * 1000));
        if (hourIdx >= 0 && hourIdx < 24) {
          buckets[hourIdx].prompt += s.tokenUsage.prompt;
          buckets[hourIdx].completion += s.tokenUsage.completion;
        }
      });

    return buckets;
  }, [agentSessions]);

  // ── Status Breakdown ─────────────────────────────────────────────

  const statusData = useMemo(() => {
    const counts: Partial<Record<SessionStatus, number>> = {};
    agentSessions.forEach((s) => {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    });
    return (Object.entries(counts) as [SessionStatus, number][]).map(
      ([status, count]) => ({
        name: STATUS_LABELS[status],
        value: count,
        color: STATUS_COLORS[status],
      }),
    );
  }, [agentSessions]);

  // ── Model Distribution ───────────────────────────────────────────

  const modelData = useMemo(() => {
    const map = new Map<
      string,
      { sessions: number; tokens: number; cost: number }
    >();
    agentSessions.forEach((s) => {
      const existing = map.get(s.model) ?? { sessions: 0, tokens: 0, cost: 0 };
      existing.sessions += 1;
      existing.tokens += s.tokenUsage.total;
      existing.cost += s.cost;
      map.set(s.model, existing);
    });
    return Array.from(map.entries())
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [agentSessions]);

  // ── Empty State ──────────────────────────────────────────────────

  if (agentSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Activity className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          No session data available
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Performance metrics will appear here once this agent processes sessions
        </p>
      </div>
    );
  }

  // ── Shared tooltip styles ────────────────────────────────────────

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  };

  const tooltipLabelStyle = { color: 'hsl(var(--foreground))' };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Stat Cards: Response Time */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Response Time Distribution</h3>
          <span className="text-xs text-muted-foreground">
            ({responseTimeStats.count} completed sessions)
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Average', value: formatMs(responseTimeStats.avg) },
            { label: 'p50 (Median)', value: formatMs(responseTimeStats.p50) },
            { label: 'p95', value: formatMs(responseTimeStats.p95) },
            { label: 'p99', value: formatMs(responseTimeStats.p99) },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {stat.label}
                </p>
                <p className="text-xl font-bold tabular-nums">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stat Cards: Token Efficiency */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Token Efficiency</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Avg Tokens / Session',
              value: formatTokens(Math.round(tokenStats.avgTotal)),
            },
            {
              label: 'Avg Prompt Tokens',
              value: formatTokens(Math.round(tokenStats.avgPrompt)),
            },
            {
              label: 'Avg Completion Tokens',
              value: formatTokens(Math.round(tokenStats.avgCompletion)),
            },
            {
              label: 'Prompt:Completion Ratio',
              value: tokenStats.ratio > 0 ? `${tokenStats.ratio.toFixed(2)}:1` : '--',
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {stat.label}
                </p>
                <p className="text-xl font-bold tabular-nums">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts Grid: 2-col on desktop, 1-col on mobile */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Session Volume Over Time */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Session Volume (24h)</CardTitle>
            </div>
            <CardDescription>Sessions started per hour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={volumeData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="time"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                    name="Sessions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Token Usage Over Time */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Token Usage (24h)</CardTitle>
            </div>
            <CardDescription>Prompt vs completion tokens per hour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={tokenOverTime}
                  margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="perfPromptGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="perfCompletionGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="time"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${v / 1000}k` : String(v)
                    }
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Area
                    type="monotone"
                    dataKey="prompt"
                    stackId="1"
                    stroke="hsl(var(--chart-1))"
                    fill="url(#perfPromptGradient)"
                    name="Prompt"
                  />
                  <Area
                    type="monotone"
                    dataKey="completion"
                    stackId="1"
                    stroke="hsl(var(--chart-2))"
                    fill="url(#perfCompletionGradient)"
                    name="Completion"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown (Donut Chart) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Status Breakdown</CardTitle>
            </div>
            <CardDescription>Session outcome distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={30}
                    iconType="circle"
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Model Distribution Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Model Distribution</CardTitle>
            </div>
            <CardDescription>Models used by this agent</CardDescription>
          </CardHeader>
          <CardContent>
            {modelData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No model data available
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelData.map((row) => {
                    const pct =
                      agentSessions.length > 0
                        ? ((row.sessions / agentSessions.length) * 100).toFixed(
                            0,
                          )
                        : '0';
                    return (
                      <TableRow key={row.model}>
                        <TableCell>
                          <span className="font-mono text-xs font-medium">
                            {row.model}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.sessions}
                          <span className="text-muted-foreground ml-1 text-[10px]">
                            ({pct}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTokens(row.tokens)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          ${row.cost.toFixed(4)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
