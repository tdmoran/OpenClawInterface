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
        case 'cron.job.updated': {
          const data = event.data;
          const job: CronJob = {
            id: String(data.id ?? ''),
            name: String(data.name ?? ''),
            agentId: String(data.agentId ?? ''),
            schedule: String(data.schedule ?? ''),
            scheduleType: (data.scheduleType as CronJob['scheduleType']) ?? 'cron',
            intervalMinutes: data.intervalMinutes != null ? Number(data.intervalMinutes) : undefined,
            status: (data.status as CronJob['status']) ?? 'active',
            lastRunAt: data.lastRunAt != null ? Number(data.lastRunAt) : undefined,
            nextRunAt: data.nextRunAt != null ? Number(data.nextRunAt) : undefined,
            runCount: Number(data.runCount ?? 0),
            errorCount: Number(data.errorCount ?? 0),
            createdAt: Number(data.createdAt ?? Date.now()),
          };
          if (job.id) updateJob(job.id, job);
          break;
        }
        case 'cron.job.removed': {
          const jobId = typeof event.data?.jobId === 'string' ? event.data.jobId : '';
          if (jobId) removeJob(jobId);
          break;
        }
        case 'cron.run.started':
        case 'cron.run.completed': {
          const data = event.data;
          const entry: CronRunHistory = {
            id: String(data.id ?? ''),
            jobId: String(data.jobId ?? ''),
            status: (data.status as CronRunHistory['status']) ?? 'running',
            startedAt: Number(data.startedAt ?? Date.now()),
            completedAt: data.completedAt != null ? Number(data.completedAt) : undefined,
            duration: data.duration != null ? Number(data.duration) : undefined,
            sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
            error: typeof data.error === 'string' ? data.error : undefined,
          };
          if (entry.id) addHistoryEntry(entry);
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
        const result = response.result as { jobs?: CronJob[]; history?: CronRunHistory[] } | undefined;
        if (result?.jobs) setJobs(result.jobs);
        if (result?.history) setHistory(result.history);
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
        const params: Record<string, unknown> = { ...job };
        const response = await client.request('cron.create', params);
        const created = response.result as CronJob | undefined;
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
        const params: Record<string, unknown> = { id, ...update };
        await client.request('cron.update', params);
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
