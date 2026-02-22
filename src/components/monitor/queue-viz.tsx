'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QueueLane {
  label: string;
  count: number;
  color: string;
  bgColor: string;
}

export function QueueViz() {
  const lanes: QueueLane[] = [
    { label: 'Pending', count: 0, color: 'bg-slate-500', bgColor: 'bg-slate-500/10' },
    { label: 'Processing', count: 0, color: 'bg-blue-500', bgColor: 'bg-blue-500/10' },
    { label: 'Completed', count: 0, color: 'bg-emerald-500', bgColor: 'bg-emerald-500/10' },
    { label: 'Failed', count: 0, color: 'bg-red-500', bgColor: 'bg-red-500/10' },
  ];

  const total = lanes.reduce((sum, l) => sum + l.count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
          <span className="text-xs text-muted-foreground">No data</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {lanes.map((lane) => (
            <div
              key={lane.label}
              className={cn('h-full transition-all', lane.color)}
              style={{ width: total > 0 ? `${(lane.count / total) * 100}%` : '0%' }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {lanes.map((lane) => (
            <div key={lane.label} className={cn('rounded-lg p-2.5', lane.bgColor)}>
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', lane.color)} />
                <span className="text-xs text-muted-foreground">{lane.label}</span>
              </div>
              <p className="mt-1 text-lg font-bold">{lane.count}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
