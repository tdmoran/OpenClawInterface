'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { mockActivity } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';

const typeColors: Record<string, string> = {
  'session.started': 'bg-emerald-500',
  'session.ended': 'bg-slate-400',
  'session.error': 'bg-red-500',
  'agent.tool_call': 'bg-violet-500',
  'agent.tool_result': 'bg-blue-500',
  'agent.phase_change': 'bg-amber-500',
};

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {mockActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-1.5 flex-shrink-0">
                  <span className={`block h-2 w-2 rounded-full ${typeColors[activity.type] || 'bg-slate-400'}`} />
                </div>
                <div className="flex-1 space-y-1">
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
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
