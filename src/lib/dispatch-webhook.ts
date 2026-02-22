import type { WebhookIntegration, WebhookEventFilter } from '@/stores/webhook-store';
import type { AlertSeverity } from '@/types/alert';

export interface WebhookAlertPayload {
  alertName: string;
  severity: AlertSeverity;
  value: number;
  threshold: number;
  message: string;
  timestamp: string;
  ruleId: string;
  metric: string;
}

function formatSlackPayload(payload: WebhookAlertPayload) {
  const severityEmoji: Record<AlertSeverity, string> = {
    critical: ':red_circle:',
    warning: ':large_orange_circle:',
    info: ':large_blue_circle:',
  };

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji[payload.severity]} OpenClaw Alert: ${payload.alertName}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Severity:*\n${payload.severity.toUpperCase()}` },
          { type: 'mrkdwn', text: `*Metric:*\n${payload.metric}` },
          { type: 'mrkdwn', text: `*Current Value:*\n${payload.value.toFixed(2)}` },
          { type: 'mrkdwn', text: `*Threshold:*\n${payload.threshold}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: payload.message,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Rule ID: ${payload.ruleId} | ${payload.timestamp}`,
          },
        ],
      },
    ],
  };
}

function formatDiscordPayload(payload: WebhookAlertPayload) {
  const severityColor: Record<AlertSeverity, number> = {
    critical: 0xff0000,
    warning: 0xff9900,
    info: 0x3399ff,
  };

  return {
    embeds: [
      {
        title: `OpenClaw Alert: ${payload.alertName}`,
        description: payload.message,
        color: severityColor[payload.severity],
        fields: [
          { name: 'Severity', value: payload.severity.toUpperCase(), inline: true },
          { name: 'Metric', value: payload.metric, inline: true },
          { name: 'Current Value', value: payload.value.toFixed(2), inline: true },
          { name: 'Threshold', value: String(payload.threshold), inline: true },
        ],
        timestamp: payload.timestamp,
        footer: { text: `Rule: ${payload.ruleId}` },
      },
    ],
  };
}

function formatGenericPayload(payload: WebhookAlertPayload) {
  return {
    event: 'alert.fired',
    ...payload,
  };
}

function formatPayload(
  type: WebhookIntegration['type'],
  payload: WebhookAlertPayload
): Record<string, unknown> {
  switch (type) {
    case 'slack':
      return formatSlackPayload(payload);
    case 'discord':
      return formatDiscordPayload(payload);
    case 'generic':
    default:
      return formatGenericPayload(payload);
  }
}

/**
 * Dispatch an alert payload to a single webhook integration.
 * Failures are caught and never propagate to the caller.
 */
async function dispatchSingle(
  integration: WebhookIntegration,
  payload: WebhookAlertPayload,
  onSuccess?: (id: string) => void,
  onError?: (id: string, error: string) => void,
): Promise<void> {
  const body = formatPayload(integration.type, payload);
  try {
    const response = await fetch(integration.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      onError?.(integration.id, errorMsg);
    } else {
      onSuccess?.(integration.id);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    onError?.(integration.id, errorMsg);
  }
}

/**
 * Dispatch an alert to all enabled webhook integrations that match the given event filter.
 * Runs all dispatches in parallel and never blocks or throws.
 */
export async function dispatchWebhooks(
  integrations: WebhookIntegration[],
  payload: WebhookAlertPayload,
  onSuccess?: (id: string) => void,
  onError?: (id: string, error: string) => void,
): Promise<void> {
  if (integrations.length === 0) return;

  await Promise.allSettled(
    integrations.map((integration) =>
      dispatchSingle(integration, payload, onSuccess, onError)
    )
  );
}

/**
 * Send a test payload to a specific webhook integration.
 * Returns { success, error? } so the UI can show feedback.
 */
export async function sendTestWebhook(
  integration: WebhookIntegration,
): Promise<{ success: boolean; error?: string }> {
  const testPayload: WebhookAlertPayload = {
    alertName: 'Test Alert',
    severity: 'info',
    value: 42,
    threshold: 50,
    message: 'This is a test notification from OpenClaw Dashboard.',
    timestamp: new Date().toISOString(),
    ruleId: 'test-rule',
    metric: 'test_metric',
  };

  const body = formatPayload(integration.type, testPayload);

  try {
    const response = await fetch(integration.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
