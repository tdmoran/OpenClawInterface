'use client';

import Link from 'next/link';
import { Bell, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
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
  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;
  const recentAlerts = alerts.slice(0, 5);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unacknowledgedCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unacknowledgedCount > 99 ? '99+' : unacknowledgedCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Alerts</h4>
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {unacknowledgedCount} new
              </Badge>
            )}
          </div>
        </div>

        {recentAlerts.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">No alerts</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
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
                        : '—'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t px-4 py-2.5">
          <Link
            href="/alerts"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View All Alerts
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
