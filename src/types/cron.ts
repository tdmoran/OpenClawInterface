export type CronJobStatus = 'active' | 'paused' | 'error';

export type CronScheduleType = 'interval' | 'cron';

export interface CronJob {
  id: string;
  name: string;
  agentId: string;
  schedule: string;
  scheduleType: CronScheduleType;
  intervalMinutes?: number;
  status: CronJobStatus;
  lastRunAt?: number;
  nextRunAt?: number;
  runCount: number;
  errorCount: number;
  createdAt: number;
}

export type CronRunStatus = 'success' | 'error' | 'running';

export interface CronRunHistory {
  id: string;
  jobId: string;
  status: CronRunStatus;
  startedAt: number;
  completedAt?: number;
  duration?: number;
  sessionId?: string;
  error?: string;
}
