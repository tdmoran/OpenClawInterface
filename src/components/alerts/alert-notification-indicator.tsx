'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAlertsStore } from '@/stores/alerts-store';
import { useMounted } from '@/hooks/use-mounted';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AlertSeverity } from '@/types/alert';

const severityIcons: Record<AlertSeverity, typeof AlertCircle> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityColors: Record<AlertSeverity, string> = {
  critical: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

export function AlertNotificationIndicator() {
  const mounted = useMounted();
  const alerts = useAlertsStore((s) => s.alerts);
  const acknowledgeAll = useAlertsStore((s) => s.acknowledgeAll);
  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;
  const recentAlerts = alerts.slice(0, 8);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      // Mark all as read when the popover is opened
      if (open && unacknowledgedCount > 0) {
        acknowledgeAll();
      }
    },
    [acknowledgeAll, unacknowledgedCount]
  );

  return (
    <Popover onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
              aria-label={unacknowledgedCount > 0 ? `Alerts: ${unacknowledgedCount} unacknowledged` : 'Alerts: none'}
            >
              <Bell className="h-4 w-4" />
              {mounted && unacknowledgedCount > 0 && (
                <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-in fade-in zoom-in">
                  {unacknowledgedCount > 99 ? '99+' : unacknowledgedCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {unacknowledgedCount > 0
              ? `${unacknowledgedCount} unread alert${unacknowledgedCount !== 1 ? 's' : ''}`
              : 'No new alerts'}
          </p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Alerts</h4>
            {alerts.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {alerts.filter((a) => !a.acknowledged).length > 0
                  ? `${alerts.filter((a) => !a.acknowledged).length} new`
                  : 'All read'}
              </Badge>
            )}
          </div>
        </div>

        {recentAlerts.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No alerts yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure rules on the Alerts page
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {recentAlerts.map((alert) => {
              const SevIcon = severityIcons[alert.severity];
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-2.5 px-4 py-2.5 border-b last:border-0 transition-colors',
                    !alert.acknowledged && 'bg-muted/50'
                  )}
                >
                  <SevIcon
                    className={cn(
                      'h-3.5 w-3.5 mt-0.5 shrink-0',
                      severityColors[alert.severity]
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{alert.ruleName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {mounted
                        ? formatDistanceToNow(new Date(alert.createdAt), {
                            addSuffix: true,
                          })
                        : '--'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t px-4 py-2.5 flex items-center justify-between">
          <Link
            href="/alerts"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View All Alerts
          </Link>
          {alerts.filter((a) => !a.acknowledged).length > 0 && (
            <button
              onClick={acknowledgeAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <CheckCircle2 className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
