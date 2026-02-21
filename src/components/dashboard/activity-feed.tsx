'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { mockActivity, mockAgents, agentColors } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const agentInitials: Record<string, string> = {};
mockAgents.forEach((a) => {
  agentInitials[a.id] = a.name.charAt(0).toUpperCase();
});

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Bar Chatter</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-1">
            {mockActivity.map((activity) => {
              const href = activity.sessionId
                ? `/sessions/${activity.sessionId}`
                : activity.agentId
                  ? `/agents/${activity.agentId}`
                  : undefined;
              const initial = activity.agentId ? agentInitials[activity.agentId] || '?' : '?';
              const color = activity.agentId ? agentColors[activity.agentId] || 'bg-slate-500' : 'bg-slate-500';

              const content = (
                <div className={cn(
                  'flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors',
                  href && 'hover:bg-muted/50 cursor-pointer'
                )}>
                  <div className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold',
                    color
                  )}>
                    {initial}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm leading-tight">{activity.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {activity.type.split('.')[1]}
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
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
