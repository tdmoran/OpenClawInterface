'use client';

import { useMemo } from 'react';
import { cronToHuman, getNextRuns } from '@/lib/cron-utils';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CronScheduleDisplayProps {
  schedule: string;
  scheduleType: 'interval' | 'cron';
  intervalMinutes?: number;
  showNextRuns?: boolean;
  nextRunCount?: number;
  className?: string;
}

export function CronScheduleDisplay({
  schedule,
  scheduleType,
  intervalMinutes,
  showNextRuns = false,
  nextRunCount = 3,
  className,
}: CronScheduleDisplayProps) {
  const humanReadable = useMemo(() => {
    if (scheduleType === 'interval' && intervalMinutes) {
      if (intervalMinutes < 60) return `Every ${intervalMinutes} minutes`;
      if (intervalMinutes % 1440 === 0) {
        const days = intervalMinutes / 1440;
        return days === 1 ? 'Every day' : `Every ${days} days`;
      }
      if (intervalMinutes % 60 === 0) {
        const hours = intervalMinutes / 60;
        return hours === 1 ? 'Every hour' : `Every ${hours} hours`;
      }
      return `Every ${intervalMinutes} minutes`;
    }
    return cronToHuman(schedule);
  }, [schedule, scheduleType, intervalMinutes]);

  const nextRuns = useMemo(() => {
    if (!showNextRuns) return [];
    return getNextRuns(schedule, nextRunCount);
  }, [schedule, showNextRuns, nextRunCount]);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm">{humanReadable}</span>
      </div>
      {showNextRuns && nextRuns.length > 0 && (
        <div className="ml-5 space-y-0.5">
          <p className="text-xs text-muted-foreground font-medium">Next runs:</p>
          {nextRuns.map((date, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {date.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
