'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAlertsStore } from '@/stores/alerts-store';
import { useMounted } from '@/hooks/use-mounted';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import type { AlertSeverity } from '@/types/alert';

const severityConfig: Record<AlertSeverity, { icon: typeof AlertCircle; color: string; bgColor: string; label: string }> = {
  critical: { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Critical' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bgColor: 'bg-amber-500/10', label: 'Warning' },
  info: { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Info' },
};

const ALERT_ROW_HEIGHT = 80; // estimated row height in px

export function AlertHistoryLog() {
  const mounted = useMounted();
  const alerts = useAlertsStore((s) => s.alerts);
  const acknowledgeAlert = useAlertsStore((s) => s.acknowledgeAlert);
  const acknowledgeAll = useAlertsStore((s) => s.acknowledgeAll);
  const clearHistory = useAlertsStore((s) => s.clearHistory);
  const parentRef = useRef<HTMLDivElement>(null);

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  const virtualizer = useVirtualizer({
    count: alerts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ALERT_ROW_HEIGHT,
    overscan: 10,
  });

  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No alert history</p>
        <p className="text-xs text-muted-foreground mt-1">
          Triggered alerts will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </span>
          {unacknowledgedCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unacknowledgedCount} unacknowledged
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unacknowledgedCount > 0 && (
            <Button variant="outline" size="sm" onClick={acknowledgeAll}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Acknowledge All
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={clearHistory}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
        </div>
      </div>

      <div
        ref={parentRef}
        className="h-[300px] sm:h-[400px] md:h-[500px] overflow-auto pr-4"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const alert = alerts[virtualRow.index];
            const sev = severityConfig[alert.severity];
            const SevIcon = sev.icon;
            return (
              <div
                key={alert.id}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 transition-colors mb-2',
                    !alert.acknowledged && sev.bgColor,
                    alert.acknowledged && 'opacity-60'
                  )}
                >
                  <SevIcon className={cn('h-4 w-4 mt-0.5 shrink-0', sev.color)} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{alert.ruleName}</span>
                      <Badge
                        variant="outline"
                        className={cn('text-xs px-2 py-0.5', sev.color)}
                      >
                        {sev.label}
                      </Badge>
                      {alert.acknowledged && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          Acknowledged
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">
                        Value: {alert.currentValue.toFixed(2)} / Threshold: {alert.threshold}
                      </span>
                      <span>
                        {mounted
                          ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })
                          : '—'}
                      </span>
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 text-xs"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Ack
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
