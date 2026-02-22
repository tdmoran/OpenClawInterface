'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAlertsStore } from '@/stores/alerts-store';
import { AlertRuleDialog } from './alert-rule-dialog';
import { Pencil, Trash2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useMounted } from '@/hooks/use-mounted';
import { formatDistanceToNow } from 'date-fns';
import type { AlertRule, AlertSeverity } from '@/types/alert';

const severityConfig: Record<AlertSeverity, { icon: typeof AlertCircle; color: string; label: string }> = {
  critical: { icon: AlertCircle, color: 'text-red-500', label: 'Critical' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', label: 'Warning' },
  info: { icon: Info, color: 'text-blue-500', label: 'Info' },
};

const metricLabels: Record<string, string> = {
  error_rate: 'Error Rate',
  latency: 'Latency',
  active_sessions: 'Active Sessions',
  cost: 'Cost',
  token_usage: 'Token Usage',
};

export function AlertRulesTable() {
  const mounted = useMounted();
  const rules = useAlertsStore((s) => s.rules);
  const updateRule = useAlertsStore((s) => s.updateRule);
  const removeRule = useAlertsStore((s) => s.removeRule);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditingRule(null);
  };

  if (rules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No alert rules configured</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create a rule to start monitoring metrics
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Metric</TableHead>
            <TableHead className="hidden md:table-cell">Condition</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead className="hidden lg:table-cell">Last Triggered</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => {
            const sev = severityConfig[rule.severity];
            const SevIcon = sev.icon;
            return (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline" className="text-xs">
                    {metricLabels[rule.metric] || rule.metric}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell font-mono text-xs">
                  {rule.operator} {rule.threshold}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <SevIcon className={`h-3.5 w-3.5 ${sev.color}`} />
                    <span className="text-xs">{sev.label}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) =>
                      updateRule(rule.id, { enabled: checked })
                    }
                    size="sm"
                  />
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                  {mounted && rule.lastTriggeredAt
                    ? formatDistanceToNow(new Date(rule.lastTriggeredAt), { addSuffix: true })
                    : rule.lastTriggeredAt
                      ? '—'
                      : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(rule)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeRule(rule.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertRuleDialog
        open={editOpen}
        onOpenChange={handleEditClose}
        rule={editingRule}
      />
    </>
  );
}
