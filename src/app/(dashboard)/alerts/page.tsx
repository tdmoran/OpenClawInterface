'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertRulesTable } from '@/components/alerts/alert-rules-table';
import { AlertRuleDialog } from '@/components/alerts/alert-rule-dialog';
import { AlertHistoryLog } from '@/components/alerts/alert-history-log';
import { useAlertsStore } from '@/stores/alerts-store';
import { useAlertEvaluator } from '@/hooks/use-alert-evaluator';
import { Plus, Bell, ShieldAlert, Activity } from 'lucide-react';

export default function AlertsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const rules = useAlertsStore((s) => s.rules);
  const alerts = useAlertsStore((s) => s.alerts);

  // Activate the alert evaluator
  useAlertEvaluator();


  const enabledRules = rules.filter((r) => r.enabled).length;
  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;
  const criticalCount = alerts.filter(
    (a) => !a.acknowledged && a.severity === 'critical'
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enabledRules}</div>
            <p className="text-xs text-muted-foreground">
              {rules.length} total configured
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unacknowledged</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unacknowledgedCount}</div>
            <p className="text-xs text-muted-foreground">
              {alerts.length} total alerts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{criticalCount}</span>
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  Needs attention
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Unacknowledged critical alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rules Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Alert Rules</h2>
            <Badge variant="secondary" className="text-xs">
              {rules.length}
            </Badge>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create Rule
          </Button>
        </div>
        <AlertRulesTable />
      </section>

      {/* History Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Alert History</h2>
          {unacknowledgedCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unacknowledgedCount} new
            </Badge>
          )}
        </div>
        <AlertHistoryLog />
      </section>

      {/* Create Rule Dialog */}
      <AlertRuleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
