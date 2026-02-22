'use client';

import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Terminal,
  Pencil,
  MessageSquare,
  AlertCircle,
  Play,
  Square,
  Pause,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCodeMonitorStore } from '@/stores/code-monitor-store';
import type { CodeEvent, CodeEventType, Machine } from '@/types/code-monitor';

interface ActivityFeedProps {
  events: CodeEvent[];
  machines: Machine[];
}

const eventIcons: Record<CodeEventType, React.ElementType> = {
  tool_use: Terminal,
  file_edit: Pencil,
  message: MessageSquare,
  error: AlertCircle,
  session_start: Play,
  session_end: Square,
  thinking: Brain,
};

const eventBorderColors: Record<CodeEventType, string> = {
  tool_use: 'border-l-blue-500',
  file_edit: 'border-l-emerald-500',
  message: 'border-l-slate-400',
  error: 'border-l-red-500',
  session_start: 'border-l-emerald-500',
  session_end: 'border-l-slate-400',
  thinking: 'border-l-purple-500',
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toTimeString().slice(0, 8);
}

const EVENT_ROW_HEIGHT = 30; // estimated row height in px

export function ActivityFeed({ events, machines }: ActivityFeedProps) {
  const [paused, setPaused] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const selectedMachineId = useCodeMonitorStore((s) => s.selectedMachineId);

  const machineMap = new Map(machines.map((m) => [m.id, m.name]));

  const filteredEvents = selectedMachineId
    ? events.filter((e) => e.machineId === selectedMachineId)
    : events;

  const displayEvents = filteredEvents.slice(-200);

  const virtualizer = useVirtualizer({
    count: displayEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => EVENT_ROW_HEIGHT,
    overscan: 20,
  });

  // Auto-scroll to bottom when new events arrive (unless paused)
  useEffect(() => {
    if (!paused && displayEvents.length > 0) {
      virtualizer.scrollToIndex(displayEvents.length - 1, { align: 'end' });
    }
  }, [displayEvents.length, paused, virtualizer]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Activity Feed</CardTitle>
            <Badge variant="outline" className="text-xs">
              {filteredEvents.length} events
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setPaused(!paused)}
          >
            {paused ? (
              <Play className="h-3.5 w-3.5" />
            ) : (
              <Pause className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div
          ref={parentRef}
          className="h-[300px] sm:h-[500px] overflow-auto font-mono text-xs"
        >
          {displayEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No events yet</p>
            </div>
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const event = displayEvents[virtualRow.index];
                const Icon = eventIcons[event.type] || MessageSquare;
                const borderColor = eventBorderColors[event.type] || 'border-l-slate-400';
                const machineName = machineMap.get(event.machineId) || event.machineId;

                return (
                  <div
                    key={event.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className={cn(
                      'flex items-start gap-2 px-3 py-1.5 border-b border-border/50 border-l-2 hover:bg-muted/50 transition-colors',
                      borderColor
                    )}
                  >
                    <span className="text-muted-foreground shrink-0 w-16">
                      {formatTime(event.timestamp)}
                    </span>
                    <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
                      {machineName}
                    </Badge>
                    {event.source === 'local' && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 text-purple-500 border-purple-500/30">
                        local
                      </Badge>
                    )}
                    {(event.toolName || event.filePath) && (
                      <span className="text-muted-foreground shrink-0 truncate max-w-[120px]">
                        {event.toolName || event.filePath}
                      </span>
                    )}
                    <span className="flex-1 truncate">{event.message}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
