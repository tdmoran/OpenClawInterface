'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusDot } from '@/components/shared/status-dot';
import { Badge } from '@/components/ui/badge';
import { mockHealth } from '@/lib/mock-data';
import { useConnectionStore } from '@/stores/connection-store';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { Server, Radio, ListTodo, Users, Clock } from 'lucide-react';

function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

export function HealthCards() {
  const connectionStatus = useConnectionStore((s) => s.status);
  const { health, server } = useGatewayDataStore();

  const isLive = connectionStatus === 'connected' && health !== null;

  // Derive channel list for live data
  const liveChannels = useMemo(() => {
    if (!health) return [];
    return (health.channelOrder ?? []).map((key) => {
      const ch = health.channels[key];
      return {
        key,
        label: ch?.label ?? key,
        running: ch?.running ?? false,
      };
    });
  }, [health]);

  const mockData = mockHealth;

  return (
    <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${isLive ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {/* Gateway Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Gateway</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLive ? (
            <>
              <div className="flex items-center gap-2">
                <StatusDot status={health.ok ? 'healthy' : 'down'} />
                <span className="text-2xl font-bold capitalize">
                  {health.ok ? 'healthy' : 'unhealthy'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                v{server?.version ?? '—'} &middot; {health.durationMs}ms latency
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <StatusDot status={mockData.gateway.status} />
                <span className="text-2xl font-bold capitalize">{mockData.gateway.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                v{mockData.gateway.version} &middot; {mockData.gateway.latency}ms latency
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Channels Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Channels</CardTitle>
          <Radio className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLive ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold">
                  {liveChannels.filter((c) => c.running).length}/{liveChannels.length}
                </span>
                <span className="text-sm text-muted-foreground">connected</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {liveChannels.map((ch) => (
                  <Badge key={ch.key} variant={ch.running ? 'default' : 'secondary'} className="text-xs">
                    <StatusDot status={ch.running ? 'connected' : 'disconnected'} size="sm" className="mr-1" />
                    {ch.label}
                  </Badge>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold">
                  {mockData.channels.filter((c) => c.status === 'connected').length}/{mockData.channels.length}
                </span>
                <span className="text-sm text-muted-foreground">connected</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {mockData.channels.map((ch) => (
                  <Badge key={ch.name} variant={ch.status === 'connected' ? 'default' : 'secondary'} className="text-xs">
                    <StatusDot status={ch.status} size="sm" className="mr-1" />
                    {ch.name}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isLive ? (
        <>
          {/* Sessions Card (live only) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{health.sessions.count}</span>
                <span className="text-sm text-muted-foreground">total</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {health.sessions.recent.length} recent
              </p>
            </CardContent>
          </Card>

          {/* Uptime Card (live only) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{formatUptime(health.uptimeMs)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {health.agents.length} agent{health.agents.length !== 1 ? 's' : ''} registered
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Queue Card (mock fallback) */
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Queue</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{mockData.queue.pending + mockData.queue.processing}</span>
              <span className="text-sm text-muted-foreground">in queue</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
              <div>
                <p className="text-muted-foreground">Pending</p>
                <p className="font-medium">{mockData.queue.pending}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Active</p>
                <p className="font-medium">{mockData.queue.processing}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Done</p>
                <p className="font-medium">{mockData.queue.completed}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Failed</p>
                <p className="font-medium text-destructive">{mockData.queue.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
