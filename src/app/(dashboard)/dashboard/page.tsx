'use client';

import { HealthCards } from '@/components/dashboard/health-cards';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { TokenChart } from '@/components/dashboard/token-chart';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { CostBreakdown } from '@/components/dashboard/cost-breakdown';
import { useSettingsStore, DEFAULT_DASHBOARD_WIDGETS } from '@/stores/settings-store';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings2, LayoutDashboard } from 'lucide-react';

const WIDGET_LABELS: Record<string, string> = {
  healthCards: 'Health Cards',
  statsCards: 'Stats Cards',
  tokenChart: 'Token Usage Chart',
  activityFeed: 'Activity Feed',
  costBreakdown: 'Cost Breakdown',
};

export default function DashboardPage() {
  const dashboardWidgets = useSettingsStore((s) => s.dashboardWidgets);
  const toggleWidget = useSettingsStore((s) => s.toggleWidget);

  // Merge with defaults so new widgets added later are visible by default
  const widgets = { ...DEFAULT_DASHBOARD_WIDGETS, ...dashboardWidgets };

  const allHidden = Object.values(widgets).every((v) => !v);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings2 className="h-4 w-4" />
              Customize
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56">
            <div className="space-y-1 mb-3">
              <p className="text-sm font-medium">Dashboard Widgets</p>
              <p className="text-xs text-muted-foreground">
                Toggle which widgets are visible.
              </p>
            </div>
            <div className="space-y-3">
              {Object.keys(DEFAULT_DASHBOARD_WIDGETS).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`widget-${key}`}
                    checked={widgets[key] ?? true}
                    onCheckedChange={() => toggleWidget(key)}
                  />
                  <Label
                    htmlFor={`widget-${key}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {WIDGET_LABELS[key] ?? key}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {allHidden ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <LayoutDashboard className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">All widgets are hidden.</p>
          <p className="text-xs mt-1">
            Click <span className="font-medium text-foreground">Customize</span> to show widgets.
          </p>
        </div>
      ) : (
        <>
          {widgets.healthCards && <HealthCards />}
          {widgets.statsCards && <StatsCards />}
          {(widgets.tokenChart || widgets.activityFeed) && (
            <div className="grid gap-6 md:grid-cols-2">
              {widgets.tokenChart && <TokenChart />}
              {widgets.activityFeed && <ActivityFeed />}
            </div>
          )}
          {widgets.costBreakdown && <CostBreakdown />}
        </>
      )}
    </div>
  );
}
