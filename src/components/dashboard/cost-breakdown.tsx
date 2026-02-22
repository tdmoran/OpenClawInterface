'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { DollarSign, Bot, Cpu, WifiOff } from 'lucide-react';
import { useCostTracking } from '@/hooks/use-cost-tracking';
import { formatTokenCount, formatCost } from '@/lib/formatters';
import { useConnectionStore } from '@/stores/connection-store';
import { cn } from '@/lib/utils';

export function CostBreakdown() {
  const connectionStatus = useConnectionStore((s) => s.status);
  const isConnected = connectionStatus === 'connected';
  const { dailyCost, dailyTokens, costByAgent, costByModel, costHistory } = useCostTracking();

  // Prepare cost history data for the bar chart
  const chartData = useMemo(() => {
    return costHistory.map((entry) => {
      const date = new Date(entry.timestamp);
      const hours = date.getHours();
      const label = `${hours.toString().padStart(2, '0')}:00`;
      return {
        time: label,
        cost: Math.round(entry.cost * 100) / 100,
        tokens: entry.tokens,
      };
    });
  }, [costHistory]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Cost Breakdown</CardTitle>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Today: <span className="font-semibold text-foreground">${dailyCost.toFixed(2)}</span>
          </span>
          <span className="text-muted-foreground">
            Tokens: <span className="font-semibold text-foreground">{formatTokenCount(dailyTokens)}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <WifiOff className="h-8 w-8 opacity-40" />
            <p className="text-sm">Connect to gateway to see cost data</p>
          </div>
        ) : (
        <Tabs defaultValue="agents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="agents" className="gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              By Agent
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-1.5">
              <Cpu className="h-3.5 w-3.5" />
              By Model
            </TabsTrigger>
            <TabsTrigger value="trend" className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Daily Trend
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costByAgent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Waiting for session data
                    </TableCell>
                  </TableRow>
                ) : (
                  costByAgent.map((entry) => {
                    const color = 'bg-slate-500';
                    return (
                      <TableRow key={entry.agentId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold',
                                color
                              )}
                            >
                              {entry.agentName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{entry.agentName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{entry.sessionCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatTokenCount(entry.totalTokens)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatCost(entry.totalCost)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
                {costByAgent.length > 0 && (
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {costByAgent.reduce((sum, e) => sum + e.sessionCount, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatTokenCount(costByAgent.reduce((sum, e) => sum + e.totalTokens, 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatCost(costByAgent.reduce((sum, e) => sum + e.totalCost, 0))}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="models">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Prompt</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costByModel.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      Waiting for session data
                    </TableCell>
                  </TableRow>
                ) : (
                  costByModel.map((entry) => (
                    <TableRow key={entry.model}>
                      <TableCell>
                        <span className="font-medium text-xs font-mono">{entry.model}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{entry.sessionCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatTokenCount(entry.promptTokens)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatTokenCount(entry.completionTokens)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatCost(entry.totalCost)}</TableCell>
                    </TableRow>
                  ))
                )}
                {costByModel.length > 0 && (
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {costByModel.reduce((sum, e) => sum + e.sessionCount, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatTokenCount(costByModel.reduce((sum, e) => sum + e.promptTokens, 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatTokenCount(costByModel.reduce((sum, e) => sum + e.completionTokens, 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatCost(costByModel.reduce((sum, e) => sum + e.totalCost, 0))}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="trend">
            <div className="h-[200px] md:h-[250px]">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  Waiting for cost history data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="time"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number | string | undefined) => [`$${Number(value ?? 0).toFixed(2)}`, 'Cumulative Cost']}
                    />
                    <Bar
                      dataKey="cost"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                      name="Cost"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>
        </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
