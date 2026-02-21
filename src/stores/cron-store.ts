import { create } from 'zustand';
import type { CronJob, CronRunHistory } from '@/types/cron';

interface CronState {
  jobs: Map<string, CronJob>;
  history: CronRunHistory[];
  addJob: (job: CronJob) => void;
  updateJob: (id: string, update: Partial<CronJob>) => void;
  removeJob: (id: string) => void;
  setJobs: (jobs: CronJob[]) => void;
  addHistoryEntry: (entry: CronRunHistory) => void;
  setHistory: (history: CronRunHistory[]) => void;
  getJobs: () => CronJob[];
}

export const useCronStore = create<CronState>((set, get) => ({
  jobs: new Map(),
  history: [],
  addJob: (job) =>
    set((state) => {
      const jobs = new Map(state.jobs);
      jobs.set(job.id, job);
      return { jobs };
    }),
  updateJob: (id, update) =>
    set((state) => {
      const jobs = new Map(state.jobs);
      const existing = jobs.get(id);
      if (existing) {
        jobs.set(id, { ...existing, ...update });
      }
      return { jobs };
    }),
  removeJob: (id) =>
    set((state) => {
      const jobs = new Map(state.jobs);
      jobs.delete(id);
      return { jobs };
    }),
  setJobs: (jobs) =>
    set(() => {
      const map = new Map<string, CronJob>();
      jobs.forEach((job) => map.set(job.id, job));
      return { jobs: map };
    }),
  addHistoryEntry: (entry) =>
    set((state) => ({
      history: [entry, ...state.history].slice(0, 200),
    })),
  setHistory: (history) => set({ history }),
  getJobs: () => Array.from(get().jobs.values()),
}));
