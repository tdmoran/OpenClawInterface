'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MachineCard } from '@/components/code-monitor/machine-card';
import type { Machine } from '@/types/code-monitor';

type FilterType = 'all' | 'online' | 'busy';

interface MachineGridProps {
  machines: Machine[];
}

export function MachineGrid({ machines }: MachineGridProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = machines.filter((m) => {
    if (filter === 'all') return true;
    if (filter === 'online') return m.status === 'online';
    if (filter === 'busy') return m.status === 'busy';
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['all', 'online', 'busy'] as FilterType[]).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-3 capitalize"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No machines connected</p>
          <p className="text-xs mt-1">Check the setup guide above to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((machine) => (
            <MachineCard key={machine.id} machine={machine} />
          ))}
        </div>
      )}
    </div>
  );
}
