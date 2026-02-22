import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WebhookType = 'slack' | 'discord' | 'generic';

export type WebhookEventFilter =
  | 'alert.critical'
  | 'alert.warning'
  | 'alert.info'
  | 'session.error'
  | 'gateway.disconnected';

export const WEBHOOK_EVENT_OPTIONS: { value: WebhookEventFilter; label: string }[] = [
  { value: 'alert.critical', label: 'Critical Alerts' },
  { value: 'alert.warning', label: 'Warning Alerts' },
  { value: 'alert.info', label: 'Info Alerts' },
  { value: 'session.error', label: 'Session Errors' },
  { value: 'gateway.disconnected', label: 'Gateway Disconnected' },
];

export interface WebhookIntegration {
  id: string;
  name: string;
  type: WebhookType;
  url: string;
  enabled: boolean;
  events: WebhookEventFilter[];
  createdAt: string;
  lastUsedAt?: string;
  lastError?: string;
}

interface WebhookState {
  integrations: WebhookIntegration[];
  addIntegration: (integration: WebhookIntegration) => void;
  updateIntegration: (id: string, update: Partial<Omit<WebhookIntegration, 'id'>>) => void;
  removeIntegration: (id: string) => void;
  toggleIntegration: (id: string) => void;
  setLastUsed: (id: string) => void;
  setLastError: (id: string, error: string) => void;
  getEnabledForEvent: (event: WebhookEventFilter) => WebhookIntegration[];
}

export const useWebhookStore = create<WebhookState>()(
  persist(
    (set, get) => ({
      integrations: [],

      addIntegration: (integration) =>
        set((state) => ({
          integrations: [...state.integrations, integration],
        })),

      updateIntegration: (id, update) =>
        set((state) => ({
          integrations: state.integrations.map((w) =>
            w.id === id ? { ...w, ...update } : w
          ),
        })),

      removeIntegration: (id) =>
        set((state) => ({
          integrations: state.integrations.filter((w) => w.id !== id),
        })),

      toggleIntegration: (id) =>
        set((state) => ({
          integrations: state.integrations.map((w) =>
            w.id === id ? { ...w, enabled: !w.enabled } : w
          ),
        })),

      setLastUsed: (id) =>
        set((state) => ({
          integrations: state.integrations.map((w) =>
            w.id === id ? { ...w, lastUsedAt: new Date().toISOString(), lastError: undefined } : w
          ),
        })),

      setLastError: (id, error) =>
        set((state) => ({
          integrations: state.integrations.map((w) =>
            w.id === id ? { ...w, lastError: error } : w
          ),
        })),

      getEnabledForEvent: (event) =>
        get().integrations.filter((w) => w.enabled && w.events.includes(event)),
    }),
    {
      name: 'openclaw-webhooks',
      partialize: (state) => ({
        integrations: state.integrations,
      }),
    }
  )
);
