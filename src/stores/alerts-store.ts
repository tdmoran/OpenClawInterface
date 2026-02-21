import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AlertRule, AlertEvent } from '@/types/alert';

interface AlertsState {
  rules: AlertRule[];
  alerts: AlertEvent[];
  addRule: (rule: AlertRule) => void;
  updateRule: (id: string, update: Partial<AlertRule>) => void;
  removeRule: (id: string) => void;
  addAlert: (alert: AlertEvent) => void;
  acknowledgeAlert: (id: string) => void;
  acknowledgeAll: () => void;
  clearHistory: () => void;
  getUnacknowledgedCount: () => number;
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      rules: [],
      alerts: [],
      addRule: (rule) =>
        set((state) => ({ rules: [...state.rules, rule] })),
      updateRule: (id, update) =>
        set((state) => ({
          rules: state.rules.map((r) =>
            r.id === id ? { ...r, ...update } : r
          ),
        })),
      removeRule: (id) =>
        set((state) => ({
          rules: state.rules.filter((r) => r.id !== id),
        })),
      addAlert: (alert) =>
        set((state) => ({
          alerts: [alert, ...state.alerts].slice(0, 500),
        })),
      acknowledgeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, acknowledged: true } : a
          ),
        })),
      acknowledgeAll: () =>
        set((state) => ({
          alerts: state.alerts.map((a) => ({ ...a, acknowledged: true })),
        })),
      clearHistory: () => set({ alerts: [] }),
      getUnacknowledgedCount: () =>
        get().alerts.filter((a) => !a.acknowledged).length,
    }),
    {
      name: 'openclaw-alerts',
      partialize: (state) => ({
        rules: state.rules,
        alerts: state.alerts,
      }),
    }
  )
);
