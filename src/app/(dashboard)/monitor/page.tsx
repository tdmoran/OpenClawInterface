'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { LogStream } from '@/components/monitor/log-stream';
import { SessionCards } from '@/components/monitor/session-cards';
import { QueueViz } from '@/components/monitor/queue-viz';

export default function MonitorPage() {
  const [throughput, setThroughput] = useState<number[]>(() =>
    Array.from({ length: 30 }, () => 0)
  );

  useEffect(() => {
    // Seed with random values after mount to avoid hydration mismatch
    setThroughput(Array.from({ length: 30 }, () => Math.floor(Math.random() * 8 + 2)));
    const interval = setInterval(() => {
      setThroughput((prev) => {
        const next = [...prev.slice(1), Math.floor(Math.random() * 8 + 2)];
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const current = throughput[throughput.length - 1];
  const sparkData = throughput.map((v, i) => ({ i, v }));

  return (
    <div className="space-y-6">
      {/* Throughput header */}
      <Card>
        <CardContent className="flex items-center gap-4 py-3">
          <Activity className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Live Throughput</p>
            <p className="text-lg font-bold">{current} events/sec</p>
          </div>
          <div className="h-10 flex-1 max-w-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LogStream />
        </div>
        <div className="space-y-6">
          <SessionCards />
          <QueueViz />
        </div>
      </div>
    </div>
  );
}
