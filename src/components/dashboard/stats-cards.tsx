'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockStats } from '@/lib/mock-data';
import { Users, Bot, Cpu, Coins, DollarSign, AlertTriangle } from 'lucide-react';

const stats = [
  { title: 'Active Sessions', icon: Users, getValue: (s: typeof mockStats) => s.activeSessions, format: (v: number) => String(v) },
  { title: 'Total Agents', icon: Bot, getValue: (s: typeof mockStats) => s.totalAgents, format: (v: number) => String(v) },
  { title: 'Running Processes', icon: Cpu, getValue: (s: typeof mockStats) => s.runningProcesses, format: (v: number) => String(v) },
  { title: 'Tokens Today', icon: Coins, getValue: (s: typeof mockStats) => s.totalTokensToday, format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v) },
  { title: 'Cost Today', icon: DollarSign, getValue: (s: typeof mockStats) => s.totalCostToday, format: (v: number) => `$${v.toFixed(2)}` },
  { title: 'Error Rate', icon: AlertTriangle, getValue: (s: typeof mockStats) => s.errorRate, format: (v: number) => `${(v * 100).toFixed(1)}%` },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const value = stat.getValue(mockStats);
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.title}</CardTitle>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.format(value)}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
