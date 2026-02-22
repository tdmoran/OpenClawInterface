'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CronJobTable } from '@/components/cron/cron-job-table';
import { CronJobDialog } from '@/components/cron/cron-job-dialog';
import { CronHistoryLog } from '@/components/cron/cron-history-log';
import { useCronActions } from '@/hooks/use-cron-actions';
import { useCronStore } from '@/stores/cron-store';
import { Plus, Timer } from 'lucide-react';
import type { CronJob } from '@/types/cron';

export default function CronPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const { loadJobs } = useCronActions();
  const jobsMap = useCronStore((s) => s.jobs);
  const jobs = useMemo(() => Array.from(jobsMap.values()), [jobsMap]);
  const activeCount = jobs.filter((j) => j.status === 'active').length;

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  function handleEdit(job: CronJob) {
    setEditingJob(job);
    setDialogOpen(true);
  }

  function handleCreate() {
    setEditingJob(null);
    setDialogOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingJob(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Cron Jobs</h2>
            <Badge variant="secondary" className="text-xs">
              {activeCount} active
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Schedule agents to run automatically on a recurring basis
          </p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Job
        </Button>
      </div>

      <CronJobTable onEdit={handleEdit} />

      <CronHistoryLog />

      <CronJobDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        editingJob={editingJob}
      />
    </div>
  );
}
