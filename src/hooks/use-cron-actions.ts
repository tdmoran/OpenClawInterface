'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGateway } from '@/hooks/use-gateway';
import { useCronStore } from '@/stores/cron-store';
import type { CronJob, CronRunHistory } from '@/types/cron';

export function useCronActions() {
  const { client, isConnected } = useGateway();
  const { setJobs, addJob, updateJob, removeJob, setHistory, addHistoryEntry } = useCronStore();
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to cron-related events from the gateway
  useEffect(() => {
    if (!client || !isConnected) return;

    const unsubscribe = client.onEvent((event) => {
      switch (event.type) {
        case 'cron.job.updated' as string: {
          const job = event.data as unknown as CronJob;
          if (job?.id) updateJob(job.id, job);
          break;
        }
        case 'cron.job.removed' as string: {
          const jobId = event.data?.jobId as string;
          if (jobId) removeJob(jobId);
          break;
        }
        case 'cron.run.started' as string:
        case 'cron.run.completed' as string: {
          const entry = event.data as unknown as CronRunHistory;
          if (entry?.id) addHistoryEntry(entry);
          break;
        }
      }
    });

    return unsubscribe;
  }, [client, isConnected, updateJob, removeJob, addHistoryEntry]);

  // Load initial data
  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      if (client && isConnected) {
        const response = await client.request('cron.list');
        const data = response.result as { jobs: CronJob[]; history: CronRunHistory[] };
        if (data?.jobs) setJobs(data.jobs);
        if (data?.history) setHistory(data.history);
      }
    } catch {
      // Ignore - no data available
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected, setJobs, setHistory]);

  const createJob = useCallback(async (job: Omit<CronJob, 'id' | 'runCount' | 'errorCount' | 'createdAt'>) => {
    setIsLoading(true);
    try {
      if (client && isConnected) {
        const response = await client.request('cron.create', job as unknown as Record<string, unknown>);
        const created = response.result as CronJob;
        if (created) addJob(created);
        return created;
      } else {
        // Offline: create locally with a temporary ID
        const localJob: CronJob = {
          ...job,
          id: `cron-local-${Date.now()}`,
          runCount: 0,
          errorCount: 0,
          createdAt: Date.now(),
        };
        addJob(localJob);
        return localJob;
      }
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected, addJob]);

  const editJob = useCallback(async (id: string, update: Partial<CronJob>) => {
    setIsLoading(true);
    try {
      if (client && isConnected) {
        await client.request('cron.update', { id, ...update } as Record<string, unknown>);
      }
      updateJob(id, update);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected, updateJob]);

  const deleteJob = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      if (client && isConnected) {
        await client.request('cron.delete', { id });
      }
      removeJob(id);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected, removeJob]);

  const pauseJob = useCallback(async (id: string) => {
    await editJob(id, { status: 'paused', nextRunAt: undefined });
  }, [editJob]);

  const resumeJob = useCallback(async (id: string) => {
    await editJob(id, { status: 'active' });
  }, [editJob]);

  return {
    loadJobs,
    createJob,
    updateJob: editJob,
    deleteJob,
    pauseJob,
    resumeJob,
    isLoading,
  };
}
