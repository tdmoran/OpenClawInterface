'use client';

import { useEffect, useRef } from 'react';
import { useAlertsStore } from '@/stores/alerts-store';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { useSessionsStore } from '@/stores/sessions-store';
import { useEventsStore } from '@/stores/events-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useConnectionStore } from '@/stores/connection-store';
import type { AlertRule, AlertOperator } from '@/types/alert';

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

function sendBrowserNotification(ruleName: string, message: string, severity: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(`OpenClaw Alert: ${ruleName}`, {
      body: message,
      icon: severity === 'critical' ? undefined : undefined,
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

          // Browser notification
          if (rule.actions.notification && notificationsEnabled) {
            sendBrowserNotification(rule.name, message, rule.severity);
          }

          // Webhook
          if (rule.actions.webhook && rule.webhookUrl) {
            callWebhook(rule.webhookUrl, {
              rule: { id: rule.id, name: rule.name, metric: rule.metric },
              alert: alertEvent,
            });
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
