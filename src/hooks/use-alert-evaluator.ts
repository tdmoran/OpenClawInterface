'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAlertsStore } from '@/stores/alerts-store';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { useSessionsStore } from '@/stores/sessions-store';
import { useEventsStore } from '@/stores/events-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useConnectionStore } from '@/stores/connection-store';
import { useWebhookStore, type WebhookEventFilter } from '@/stores/webhook-store';
import { dispatchWebhooks, type WebhookAlertPayload } from '@/lib/dispatch-webhook';
import type { AlertRule, AlertOperator, AlertSeverity } from '@/types/alert';

const EVAL_INTERVAL_MS = 10_000;

function compare(value: number, operator: AlertOperator, threshold: number): boolean {
  switch (operator) {
    case '>': return value > threshold;
    case '<': return value < threshold;
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    case '==': return value === threshold;
    default: return false;
  }
}

function getMetricValue(
  metric: AlertRule['metric'],
  health: ReturnType<typeof useGatewayDataStore.getState>['health'],
  sessions: ReturnType<typeof useSessionsStore.getState>,
  events: ReturnType<typeof useEventsStore.getState>,
): number | null {
  switch (metric) {
    case 'error_rate': {
      const entries = events.entries;
      if (entries.length === 0) return null;
      const recentWindow = Date.now() - 300_000; // last 5 minutes
      const recent = entries.filter((e) => e.timestamp > recentWindow);
      if (recent.length === 0) return null;
      const errors = recent.filter((e) => e.severity === 'error').length;
      return (errors / recent.length) * 100;
    }
    case 'latency': {
      if (!health) return null;
      return health.durationMs;
    }
    case 'active_sessions': {
      if (!health) return null;
      return health.sessions.count;
    }
    case 'cost': {
      // Derive from sessions store - sum of active session costs
      const allSessions = sessions.getSessions();
      return allSessions.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    }
    case 'token_usage': {
      // Sum total tokens from sessions
      const allSessions = sessions.getSessions();
      return allSessions.reduce((sum, s) => sum + (s.tokenUsage?.total ?? 0), 0);
    }
    default:
      return null;
  }
}

function showAlertToast(ruleName: string, message: string, severity: AlertSeverity) {
  const severityToastMap: Record<AlertSeverity, 'error' | 'warning' | 'info'> = {
    critical: 'error',
    warning: 'warning',
    info: 'info',
  };

  const toastType = severityToastMap[severity];

  toast[toastType](ruleName, {
    description: message,
    action: {
      label: 'View Alerts',
      onClick: () => {
        window.location.href = '/alerts';
      },
    },
    duration: severity === 'critical' ? 10_000 : 5_000,
  });
}

function requestPermissionOnFirstAlert() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendBrowserNotification(ruleName: string, message: string, severity: AlertSeverity) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(`OpenClaw Alert: ${ruleName}`, {
      body: message,
      tag: `openclaw-alert-${ruleName}`,
    });
  } catch {
    // Notifications may fail in some environments
  }
}

async function callWebhook(url: string, payload: Record<string, unknown>) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Webhook failures are silently ignored
  }
}

/** Map alert severity to webhook event filter type */
function severityToEventFilter(severity: AlertSeverity): WebhookEventFilter {
  switch (severity) {
    case 'critical': return 'alert.critical';
    case 'warning': return 'alert.warning';
    case 'info': return 'alert.info';
  }
}

export function useAlertEvaluator() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const connectionStatus = useConnectionStore.getState().status;
      const isConnected = connectionStatus === 'connected';
      const health = useGatewayDataStore.getState().health;
      const sessionsState = useSessionsStore.getState();
      const eventsState = useEventsStore.getState();
      const notificationsEnabled = useSettingsStore.getState().notificationsEnabled;
      const { rules, addAlert, updateRule } = useAlertsStore.getState();

      // Only evaluate when connected or if we have event data to assess
      if (!isConnected && eventsState.entries.length === 0) return;

      const now = new Date();

      for (const rule of rules) {
        if (!rule.enabled) continue;

        // Respect cooldown period
        if (rule.lastTriggeredAt) {
          const lastTriggered = new Date(rule.lastTriggeredAt);
          const cooldownMs = rule.cooldownMinutes * 60 * 1000;
          if (now.getTime() - lastTriggered.getTime() < cooldownMs) continue;
        }

        const currentValue = getMetricValue(rule.metric, health, sessionsState, eventsState);
        if (currentValue === null) continue;

        if (compare(currentValue, rule.operator, rule.threshold)) {
          const metricLabels: Record<string, string> = {
            error_rate: 'Error rate',
            latency: 'Latency',
            active_sessions: 'Active sessions',
            cost: 'Cost',
            token_usage: 'Token usage',
          };
          const metricLabel = metricLabels[rule.metric] || rule.metric;
          const message = `${metricLabel} is ${currentValue.toFixed(2)} (threshold: ${rule.operator} ${rule.threshold})`;

          const alertEvent = {
            id: `alert-${Date.now()}-${rule.id}`,
            ruleId: rule.id,
            ruleName: rule.name,
            currentValue,
            threshold: rule.threshold,
            message,
            severity: rule.severity,
            acknowledged: false,
            createdAt: now.toISOString(),
          };

          addAlert(alertEvent);
          updateRule(rule.id, { lastTriggeredAt: now.toISOString() });

          // Toast notification (always shown in-app)
          showAlertToast(rule.name, message, rule.severity);

          // Browser notification
          if (rule.actions.notification && notificationsEnabled) {
            requestPermissionOnFirstAlert();
            sendBrowserNotification(rule.name, message, rule.severity);
          }

          // Per-rule webhook (legacy)
          if (rule.actions.webhook && rule.webhookUrl) {
            callWebhook(rule.webhookUrl, {
              rule: { id: rule.id, name: rule.name, metric: rule.metric },
              alert: alertEvent,
            });
          }

          // Dispatch to configured webhook integrations
          const eventFilter = severityToEventFilter(rule.severity);
          const webhookStore = useWebhookStore.getState();
          const matchingIntegrations = webhookStore.getEnabledForEvent(eventFilter);

          if (matchingIntegrations.length > 0) {
            const webhookPayload: WebhookAlertPayload = {
              alertName: rule.name,
              severity: rule.severity,
              value: currentValue,
              threshold: rule.threshold,
              message,
              timestamp: now.toISOString(),
              ruleId: rule.id,
              metric: rule.metric,
            };

            dispatchWebhooks(
              matchingIntegrations,
              webhookPayload,
              (id) => webhookStore.setLastUsed(id),
              (id, error) => webhookStore.setLastError(id, error),
            );
          }
        }
      }
    }, EVAL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
