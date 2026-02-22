'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusDot } from '@/components/shared/status-dot';
import { CronScheduleDisplay } from '@/components/cron/cron-schedule-display';
import { useCronStore } from '@/stores/cron-store';
import { useCronActions } from '@/hooks/use-cron-actions';
import { useMounted } from '@/hooks/use-mounted';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Pencil, Pause, Play, Trash2 } from 'lucide-react';
import { useAgentsStore } from '@/stores/agents-store';
import type { CronJob } from '@/types/cron';
import type { StatusVariant } from '@/components/shared/status-dot';

const statusToDot: Record<string, StatusVariant> = {
  active: 'active',
  paused: 'idle',
  error: 'error',
};

const statusBadgeStyles: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  paused: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  error: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
};

interface CronJobTableProps {
  onEdit: (job: CronJob) => void;
}

export function CronJobTable({ onEdit }: CronJobTableProps) {
  const mounted = useMounted();
  const jobs = useCronStore((s) => s.getJobs());
  const { pauseJob, resumeJob, deleteJob } = useCronActions();

  const agents = useAgentsStore((s) => s.getAgents());
  const agentMap = useMemo(() => {
    const map: Record<string, string> = {};
    agents.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [agents]);

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No cron jobs configured</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create a job to schedule automated agent runs
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead>Schedule</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Run</TableHead>
          <TableHead>Next Run</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{job.name}</span>
                <span className="text-xs text-muted-foreground">
                  {job.runCount} runs &middot; {job.errorCount} errors
                </span>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm">{agentMap[job.agentId] || job.agentId}</span>
            </TableCell>
            <TableCell>
              <CronScheduleDisplay
                schedule={job.schedule}
                scheduleType={job.scheduleType}
                intervalMinutes={job.intervalMinutes}
              />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <StatusDot status={statusToDot[job.status] || 'idle'} size="sm" />
                <Badge variant="outline" className={statusBadgeStyles[job.status]}>
                  {job.status}
                </Badge>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {job.lastRunAt && mounted
                  ? formatDistanceToNow(job.lastRunAt, { addSuffix: true })
                  : '--'}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {job.nextRunAt && mounted
                  ? formatDistanceToNow(job.nextRunAt, { addSuffix: true })
                  : '--'}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(job)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  {job.status === 'active' ? (
                    <DropdownMenuItem onClick={() => pauseJob(job.id)}>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => resumeJob(job.id)}>
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-red-600 dark:text-red-400"
                    onClick={() => deleteJob(job.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
