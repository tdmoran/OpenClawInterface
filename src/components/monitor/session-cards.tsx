'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/shared/status-dot';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { useConnectionStore } from '@/stores/connection-store';
import { Clock, Coins, MessageSquare, Wrench } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useMounted } from '@/hooks/use-mounted';
import type { Session } from '@/types/session';

export function SessionCards() {
  const mounted = useMounted();
  const connectionStatus = useConnectionStore((s) => s.status);
  const health = useGatewayDataStore((s) => s.health);
  const isConnected = connectionStatus === 'connected' && health !== null;

  const sessions: Session[] = useMemo(() => {
    if (!isConnected) return [];

    return health.sessions.recent.map((s) => ({
      id: s.key,
      agentId: s.key.split(':')[1] || 'main',
      agentName: 'Clawkins',
      channel: s.key.includes('cron') ? 'cron' : 'gateway',
      status: (s.age < 300000 ? 'active' : 'completed') as Session['status'],
      model: 'moonshot/kimi-k2.5',
      startedAt: s.updatedAt - s.age,
      endedAt: s.age < 300000 ? undefined : s.updatedAt,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      cost: 0,
      messageCount: 0,
      toolCallCount: 0,
      traces: [],
    }));
  }, [isConnected, health]);

  const activeSessions = sessions.filter((s) => s.status === 'active');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Active Sessions ({activeSessions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeSessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No active sessions</p>
          )}
          {activeSessions.map((session) => (
            <div key={session.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status="active" />
                  <span className="font-medium text-sm">{session.agentName}</span>
                </div>
                <Badge variant="outline" className="text-xs">{session.channel}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {mounted ? formatDistanceToNow(session.startedAt) : '—'}
                </div>
                <div className="flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  {(session.tokenUsage.total / 1000).toFixed(1)}k
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {session.messageCount}
                </div>
                <div className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  {session.toolCallCount}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{session.model}</span>
                <span className="text-xs font-medium">${session.cost.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
