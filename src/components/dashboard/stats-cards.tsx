'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockStats, mockStatsComparison, mockSparklineData } from '@/lib/mock-data';
import { useConnectionStore } from '@/stores/connection-store';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { Users, Bot, Cpu, Coins, DollarSign, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { DashboardStats } from '@/types/events';
import { cn } from '@/lib/utils';

const stats = [
  { title: 'Active Sessions', key: 'activeSessions' as const, icon: Users, getValue: (s: DashboardStats) => s.activeSessions, format: (v: number) => String(v) },
  { title: 'Total Agents', key: 'totalAgents' as const, icon: Bot, getValue: (s: DashboardStats) => s.totalAgents, format: (v: number) => String(v) },
  { title: 'Running Processes', key: 'runningProcesses' as const, icon: Cpu, getValue: (s: DashboardStats) => s.runningProcesses, format: (v: number) => String(v) },
  { title: 'Tokens Today', key: 'totalTokensToday' as const, icon: Coins, getValue: (s: DashboardStats) => s.totalTokensToday, format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v) },
  { title: 'Cost Today', key: 'totalCostToday' as const, icon: DollarSign, getValue: (s: DashboardStats) => s.totalCostToday, format: (v: number) => `$${v.toFixed(2)}` },
  { title: 'Error Rate', key: 'errorRate' as const, icon: AlertTriangle, getValue: (s: DashboardStats) => s.errorRate, format: (v: number) => `${(v * 100).toFixed(1)}%`, invertTrend: true },
];

function TrendIndicator({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct > 0;
  const isNeutral = Math.abs(pct) < 0.5;

  if (isNeutral) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }

  const isPositive = invert ? !isUp : isUp;
  return (
    <span className={cn('flex items-center gap-0.5 text-[10px] font-medium', isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

export function StatsCards() {
  const connectionStatus = useConnectionStore((s) => s.status);
  const { health, presence } = useGatewayDataStore();

  const isLive = connectionStatus === 'connected' && health !== null;

  // Merge live data into mock stats when connected
  const effectiveStats: DashboardStats = useMemo(() => {
    if (!isLive) return mockStats;

    const now = Date.now();
    const activeSessions = health.sessions.recent.filter(
      (s) => now - s.updatedAt < 300_000
    ).length;
    const runningProcesses = presence.filter((p) => p.reason === 'connect').length;

    return {
      ...mockStats,
      totalAgents: health.agents.length,
      activeSessions,
      runningProcesses,
    };
  }, [isLive, health, presence]);

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const value = stat.getValue(effectiveStats);
        const prevValue = stat.getValue(mockStatsComparison);
        const sparkData = (mockSparklineData[stat.key] || []).map((v, i) => ({ i, v }));
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.title}</CardTitle>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold">{stat.format(value)}</div>
              <TrendIndicator current={value} previous={prevValue} invert={stat.invertTrend} />
              {sparkData.length > 0 && (
                <div className="h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkData}>
                      <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
