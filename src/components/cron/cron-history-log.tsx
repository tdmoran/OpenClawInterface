'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCronStore } from '@/stores/cron-store';
import { useMounted } from '@/hooks/use-mounted';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { CronRunStatus } from '@/types/cron';

const statusConfig: Record<CronRunStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Success' },
  error: { icon: XCircle, color: 'text-red-500', label: 'Error' },
  running: { icon: Loader2, color: 'text-blue-500', label: 'Running' },
};

function formatDuration(ms?: number): string {
  if (!ms) return '--';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function CronHistoryLog() {
  const mounted = useMounted();
  const history = useCronStore((s) => s.history);
  const jobs = useCronStore((s) => s.jobs);

  const sortedHistory = [...history].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Run History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-1">
            {sortedHistory.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">No run history yet</p>
              </div>
            )}
            {sortedHistory.map((entry) => {
              const config = statusConfig[entry.status];
              const Icon = config.icon;
              const job = jobs.get(entry.jobId);
              const href = entry.sessionId ? `/sessions/${entry.sessionId}` : undefined;

              const content = (
                <div
                  className={cn(
                    'flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors',
                    href && 'hover:bg-muted/50 cursor-pointer'
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        config.color,
                        entry.status === 'running' && 'animate-spin'
                      )}
                    />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium leading-tight truncate">
                        {job?.name || entry.jobId}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0',
                          entry.status === 'success' && 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
                          entry.status === 'error' && 'border-red-500/30 text-red-600 dark:text-red-400',
                          entry.status === 'running' && 'border-blue-500/30 text-blue-600 dark:text-blue-400'
                        )}
                      >
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {mounted
                          ? formatDistanceToNow(entry.startedAt, { addSuffix: true })
                          : '--'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(entry.duration)}
                      </span>
                      {entry.sessionId && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {entry.sessionId}
                        </Badge>
                      )}
                    </div>
                    {entry.error && (
                      <p className="text-xs text-red-500 truncate">{entry.error}</p>
                    )}
                  </div>
                </div>
              );

              return href ? (
                <Link key={entry.id} href={href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={entry.id}>{content}</div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
