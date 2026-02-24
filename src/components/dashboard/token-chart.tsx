'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { useConnectionStore } from '@/stores/connection-store';
import { useSessionsStore } from '@/stores/sessions-store';
import { WifiOff, BarChart3 } from 'lucide-react';

type Range = '1h' | '6h' | '24h' | '7d';
const ranges: Range[] = ['1h', '6h', '24h', '7d'];

/** Number of time buckets to display per range. */
const BUCKET_COUNTS: Record<Range, number> = {
  '1h': 12,   // 5-minute buckets
  '6h': 24,   // 15-minute buckets
  '24h': 24,  // 1-hour buckets
  '7d': 7,    // 1-day buckets
};

/** Milliseconds per range. */
const RANGE_MS: Record<Range, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

function formatBucketLabel(ts: number, r: Range): string {
  const d = new Date(ts);
  if (r === '7d') {
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  }
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function TokenChart() {
  const [range, setRange] = useState<Range>('24h');
  const connectionStatus = useConnectionStore((s) => s.status);
  const sessions = useSessionsStore((s) => s.sessions);

  const isConnected = connectionStatus === 'connected';

  const data = useMemo(() => {
    const sessionList = Array.from(sessions.values());
    if (sessionList.length === 0) return [];

    const now = Date.now();
    const rangeMs = RANGE_MS[range];
    const bucketCount = BUCKET_COUNTS[range];
    const bucketSize = rangeMs / bucketCount;
    const windowStart = now - rangeMs;

    // Initialize buckets
    const buckets: { time: string; prompt: number; completion: number }[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = windowStart + i * bucketSize;
      buckets.push({
        time: formatBucketLabel(bucketStart, range),
        prompt: 0,
        completion: 0,
      });
    }

    // Distribute session tokens into buckets based on startedAt
    for (const session of sessionList) {
      if (session.startedAt < windowStart) continue;
      const bucketIndex = Math.min(
        Math.floor((session.startedAt - windowStart) / bucketSize),
        bucketCount - 1
      );
      if (bucketIndex >= 0) {
        buckets[bucketIndex].prompt += session.tokenUsage.prompt;
        buckets[bucketIndex].completion += session.tokenUsage.completion;
      }
    }

    return buckets;
  }, [sessions, range]);

  const hasData = data.some((d) => d.prompt > 0 || d.completion > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Token Usage ({range})</CardTitle>
        <div className="flex gap-1 flex-wrap">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                r === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] sm:h-[280px] md:h-[320px]">
          {!isConnected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <WifiOff className="h-8 w-8 opacity-40" />
              <p className="text-sm">Connect gateway to see token usage</p>
            </div>
          ) : !hasData ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <BarChart3 className="h-8 w-8 opacity-40" />
              <p className="text-sm">No token data in this time range</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="promptGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="prompt" stackId="1" stroke="hsl(var(--chart-1))" fill="url(#promptGradient)" name="Prompt" />
                <Area type="monotone" dataKey="completion" stackId="1" stroke="hsl(var(--chart-2))" fill="url(#completionGradient)" name="Completion" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
