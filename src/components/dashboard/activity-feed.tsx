'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useConnectionStore } from '@/stores/connection-store';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/use-mounted';
import { WifiOff, Activity } from 'lucide-react';
import type { ActivityEntry } from '@/types/events';

const agentInitials: Record<string, string> = {};

export function ActivityFeed() {
  const mounted = useMounted();
  const connectionStatus = useConnectionStore((s) => s.status);
  const { presence } = useGatewayDataStore();

  const isLive = connectionStatus === 'connected' && presence.length > 0;

  // Convert presence events to activity entries when connected
  const liveActivity: ActivityEntry[] = useMemo(() => {
    if (!isLive) return [];
    return presence
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .map((p, i) => {
        const isConnect = p.reason === 'connect';
        const description = isConnect
          ? `${p.host} connected${p.version ? ` (v${p.version})` : ''}${p.platform ? ` on ${p.platform}` : ''}`
          : `${p.host} disconnected (${p.reason})`;
        return {
          id: `presence-${i}-${p.ts}`,
          timestamp: p.ts,
          type: isConnect ? 'gateway.connect' : 'gateway.disconnect',
          description,
        };
      });
  }, [isLive, presence]);

  const activities = liveActivity;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {connectionStatus !== 'connected' ? (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <WifiOff className="h-8 w-8 opacity-40" />
              <p className="text-sm">Connect to gateway to see activity</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <Activity className="h-8 w-8 opacity-40" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
          <div className="space-y-1">
            {activities.map((activity) => {
              const href = activity.sessionId
                ? `/sessions/${activity.sessionId}`
                : activity.agentId
                  ? `/agents/${activity.agentId}`
                  : undefined;
              const initial = activity.agentId ? agentInitials[activity.agentId] || '?' : '?';
              const color = 'bg-slate-500';

              // For live presence events, use a gateway-style avatar
              const isPresenceEvent = activity.type === 'gateway.connect' || activity.type === 'gateway.disconnect';
              const avatarInitial = isPresenceEvent ? 'G' : initial;
              const avatarColor = isPresenceEvent
                ? (activity.type === 'gateway.connect' ? 'bg-emerald-500' : 'bg-slate-500')
                : color;

              const content = (
                <div className={cn(
                  'flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors',
                  href && 'hover:bg-muted/50 cursor-pointer'
                )}>
                  <div className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold',
                    avatarColor
                  )}>
                    {avatarInitial}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm leading-tight">{activity.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {mounted ? formatDistanceToNow(activity.timestamp, { addSuffix: true }) : '—'}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {activity.type.includes('.') ? activity.type.split('.')[1] : activity.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              );

              return href ? (
                <Link key={activity.id} href={href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={activity.id}>{content}</div>
              );
            })}
          </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
