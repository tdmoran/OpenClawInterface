'use client';

import { Monitor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCodeMonitor } from '@/hooks/use-code-monitor';
import { MachineGrid } from '@/components/code-monitor/machine-grid';
import { ActivityFeed } from '@/components/code-monitor/activity-feed';
import { CommandPanel } from '@/components/code-monitor/command-panel';
import { SessionOverview } from '@/components/code-monitor/session-overview';
import { SetupGuide } from '@/components/code-monitor/setup-guide';

export default function CodeMonitorPage() {
  const { machines, events, commands, activeSessions, onlineMachines } = useCodeMonitor();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Monitor className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Code Monitor</h1>
        <Badge variant={onlineMachines.length > 0 ? 'default' : 'secondary'}>
          {onlineMachines.length} online
        </Badge>
      </div>

      {/* Setup guide when no machines */}
      {machines.length === 0 && <SetupGuide />}

      {/* Machine Grid */}
      <MachineGrid machines={machines} />

      {/* Activity + Commands split */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed events={events} machines={machines} />
        </div>
        <div>
          <CommandPanel machines={machines} commands={commands} />
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <SessionOverview sessions={activeSessions} />
      )}
    </div>
  );
}
