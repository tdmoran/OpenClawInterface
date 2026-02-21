'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAlertsStore } from '@/stores/alerts-store';
import { useConnectionStore } from '@/stores/connection-store';
import type { AlertRule, AlertMetric, AlertOperator, AlertSeverity } from '@/types/alert';

const metrics: { value: AlertMetric; label: string }[] = [
  { value: 'error_rate', label: 'Error Rate (%)' },
  { value: 'latency', label: 'Latency (ms)' },
  { value: 'active_sessions', label: 'Active Sessions' },
  { value: 'cost', label: 'Cost ($)' },
  { value: 'token_usage', label: 'Token Usage' },
];

const operators: { value: AlertOperator; label: string }[] = [
  { value: '>', label: '> (greater than)' },
  { value: '<', label: '< (less than)' },
  { value: '>=', label: '>= (greater or equal)' },
  { value: '<=', label: '<= (less or equal)' },
  { value: '==', label: '== (equal)' },
];

const severities: { value: AlertSeverity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

interface AlertRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AlertRule | null;
}

export function AlertRuleDialog({ open, onOpenChange, rule }: AlertRuleDialogProps) {
  const addRule = useAlertsStore((s) => s.addRule);
  const updateRule = useAlertsStore((s) => s.updateRule);
  const connectionStatus = useConnectionStore((s) => s.status);
  const isConnected = connectionStatus === 'connected';
  const isEditing = !!rule;

  const [name, setName] = useState('');
  const [metric, setMetric] = useState<AlertMetric>('error_rate');
  const [operator, setOperator] = useState<AlertOperator>('>');
  const [threshold, setThreshold] = useState<string>('0');
  const [severity, setSeverity] = useState<AlertSeverity>('warning');
  const [notificationAction, setNotificationAction] = useState(true);
  const [webhookAction, setWebhookAction] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [cooldownMinutes, setCooldownMinutes] = useState<string>('5');

  // Reset form when opening or when rule changes
  useEffect(() => {
    if (open) {
      if (rule) {
        setName(rule.name);
        setMetric(rule.metric);
        setOperator(rule.operator);
        setThreshold(String(rule.threshold));
        setSeverity(rule.severity);
        setNotificationAction(rule.actions.notification);
        setWebhookAction(rule.actions.webhook);
        setWebhookUrl(rule.webhookUrl || '');
        setCooldownMinutes(String(rule.cooldownMinutes));
      } else {
        setName('');
        setMetric('error_rate');
        setOperator('>');
        setThreshold('0');
        setSeverity('warning');
        setNotificationAction(true);
        setWebhookAction(false);
        setWebhookUrl('');
        setCooldownMinutes('5');
      }
    }
  }, [open, rule]);

  const canSubmit =
    name.trim().length > 0 &&
    Number(threshold) >= 0 &&
    Number(cooldownMinutes) >= 0 &&
    isConnected;

  const handleSubmit = () => {
    const thresholdNum = Number(threshold);
    const cooldownNum = Number(cooldownMinutes);
    if (isNaN(thresholdNum) || isNaN(cooldownNum)) return;

    if (isEditing && rule) {
      updateRule(rule.id, {
        name: name.trim(),
        metric,
        operator,
        threshold: thresholdNum,
        severity,
        actions: { notification: notificationAction, webhook: webhookAction },
        webhookUrl: webhookAction ? webhookUrl.trim() : undefined,
        cooldownMinutes: cooldownNum,
      });
    } else {
      const newRule: AlertRule = {
        id: `rule-${Date.now()}`,
        name: name.trim(),
        metric,
        operator,
        threshold: thresholdNum,
        severity,
        actions: { notification: notificationAction, webhook: webhookAction },
        webhookUrl: webhookAction ? webhookUrl.trim() : undefined,
        enabled: true,
        cooldownMinutes: cooldownNum,
      };
      addRule(newRule);
    }

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Rule' : 'Create Alert Rule'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Modify the alert rule configuration.'
              : 'Configure a new alert rule to monitor metrics.'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              placeholder="e.g. High Error Rate"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Metric */}
          <div className="space-y-2">
            <Label>Metric</Label>
            <Select value={metric} onValueChange={(v) => setMetric(v as AlertMetric)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {metrics.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator */}
          <div className="space-y-2">
            <Label>Operator</Label>
            <Select value={operator} onValueChange={(v) => setOperator(v as AlertOperator)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Threshold */}
          <div className="space-y-2">
            <Label htmlFor="rule-threshold">Threshold</Label>
            <Input
              id="rule-threshold"
              type="number"
              min={0}
              step="any"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as AlertSeverity)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {severities.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Label>Actions</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="action-notification" className="font-normal text-sm">
                Browser Notification
              </Label>
              <Switch
                id="action-notification"
                checked={notificationAction}
                onCheckedChange={setNotificationAction}
                size="sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="action-webhook" className="font-normal text-sm">
                Webhook
              </Label>
              <Switch
                id="action-webhook"
                checked={webhookAction}
                onCheckedChange={setWebhookAction}
                size="sm"
              />
            </div>
            {webhookAction && (
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://hooks.example.com/alerts"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Cooldown */}
          <div className="space-y-2">
            <Label htmlFor="rule-cooldown">Cooldown (minutes)</Label>
            <Input
              id="rule-cooldown"
              type="number"
              min={0}
              value={cooldownMinutes}
              onChange={(e) => setCooldownMinutes(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Minimum time between consecutive alerts for this rule.
            </p>
          </div>
        </div>

        <SheetFooter>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {isEditing ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
          {!isConnected && (
            <p className="text-xs text-muted-foreground text-center w-full">
              Connect to the gateway to create or update rules.
            </p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
