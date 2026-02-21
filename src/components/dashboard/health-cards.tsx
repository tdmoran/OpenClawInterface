'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusDot } from '@/components/shared/status-dot';
import { Badge } from '@/components/ui/badge';
import { mockHealth } from '@/lib/mock-data';
import { Server, Radio, ListTodo } from 'lucide-react';

export function HealthCards() {
  const health = mockHealth;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Gateway</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <StatusDot status={health.gateway.status} />
            <span className="text-2xl font-bold capitalize">{health.gateway.status}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            v{health.gateway.version} &middot; {health.gateway.latency}ms latency
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Channels</CardTitle>
          <Radio className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold">
              {health.channels.filter((c) => c.status === 'connected').length}/{health.channels.length}
            </span>
            <span className="text-sm text-muted-foreground">connected</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {health.channels.map((ch) => (
              <Badge key={ch.name} variant={ch.status === 'connected' ? 'default' : 'secondary'} className="text-xs">
                <StatusDot status={ch.status} size="sm" className="mr-1" />
                {ch.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Queue</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{health.queue.pending + health.queue.processing}</span>
            <span className="text-sm text-muted-foreground">in queue</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
            <div>
              <p className="text-muted-foreground">Pending</p>
              <p className="font-medium">{health.queue.pending}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Active</p>
              <p className="font-medium">{health.queue.processing}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Done</p>
              <p className="font-medium">{health.queue.completed}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Failed</p>
              <p className="font-medium text-destructive">{health.queue.failed}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
