'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/shared/status-dot';
import type { StatusVariant } from '@/components/shared/status-dot';
import { useCodeMonitorStore } from '@/stores/code-monitor-store';
import { cn } from '@/lib/utils';
import type { Machine } from '@/types/code-monitor';

interface MachineCardProps {
  machine: Machine;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const statusMap: Record<string, StatusVariant> = {
  online: 'active',
  busy: 'warning',
  offline: 'offline',
};

export function MachineCard({ machine }: MachineCardProps) {
  const selectedMachineId = useCodeMonitorStore((s) => s.selectedMachineId);
  const isSelected = selectedMachineId === machine.id;

  const handleClick = () => {
    const store = useCodeMonitorStore.getState();
    store.selectMachine(isSelected ? null : machine.id);
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:bg-accent/50',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusDot status={statusMap[machine.status] || 'offline'} />
            <CardTitle className="text-sm font-semibold">{machine.name}</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {machine.os}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{machine.hostname}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Last heartbeat</span>
          <span>{formatRelativeTime(machine.lastHeartbeat)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Active sessions</span>
          <span>{machine.activeSessions}</span>
        </div>

        {machine.cpuUsage !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">CPU</span>
              <span>{machine.cpuUsage}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  machine.cpuUsage > 80 ? 'bg-red-500' : machine.cpuUsage > 50 ? 'bg-amber-500' : 'bg-primary'
                )}
                style={{ width: `${machine.cpuUsage}%` }}
              />
            </div>
          </div>
        )}

        {machine.memUsage !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Memory</span>
              <span>{machine.memUsage}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  machine.memUsage > 80 ? 'bg-red-500' : machine.memUsage > 50 ? 'bg-amber-500' : 'bg-primary'
                )}
                style={{ width: `${machine.memUsage}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
