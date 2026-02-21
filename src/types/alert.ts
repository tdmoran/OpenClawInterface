export type AlertMetric = 'error_rate' | 'latency' | 'active_sessions' | 'cost' | 'token_usage';

export type AlertOperator = '>' | '<' | '>=' | '<=' | '==';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertRule {
  id: string;
  name: string;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  severity: AlertSeverity;
  actions: {
    notification: boolean;
    webhook: boolean;
  };
  webhookUrl?: string;
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggeredAt?: string;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  currentValue: number;
  threshold: number;
  message: string;
  severity: AlertSeverity;
  acknowledged: boolean;
  createdAt: string;
}
