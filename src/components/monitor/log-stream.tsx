'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Pause, Play, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateMockLogs } from '@/lib/mock-data';
import type { LogEntry } from '@/types/events';

const severityColors: Record<string, string> = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
  debug: 'text-slate-400',
};

const severityBg: Record<string, string> = {
  info: 'bg-blue-500/10',
  warning: 'bg-amber-500/10',
  error: 'bg-red-500/10',
  debug: 'bg-slate-500/10',
};

let logCounter = 0;

export function LogStream() {
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const initial = generateMockLogs(50);
    return initial.map((l) => ({ ...l, id: `log-init-${logCounter++}` }));
  });
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const addNewLogs = useCallback(() => {
    const rawLogs = generateMockLogs(1);
    const uniqueId = `log-${Date.now()}-${logCounter++}-${Math.random().toString(36).slice(2, 6)}`;
    const newLogs = rawLogs.map((l) => ({ ...l, id: uniqueId }));

    setLogs((prev) => {
      const updated = [...prev, ...newLogs];
      return updated.length > 500 ? updated.slice(-500) : updated;
    });

    const ids = new Set(newLogs.map((l) => l.id));
    setNewLogIds(ids);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNewLogIds(new Set()), 1000);
  }, []);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(addNewLogs, 2000);
    return () => clearInterval(interval);
  }, [paused, addNewLogs]);

  useEffect(() => {
    if (!paused) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, paused]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const filtered = logs.filter((log) => {
    if (selectedSeverity && log.severity !== selectedSeverity) return false;
    if (search) {
      const s = search.toLowerCase();
      return log.message.toLowerCase().includes(s) || log.type.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Log Stream</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{logs.length} entries</Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPaused(!paused)}>
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLogs([])}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search logs..." className="h-8 pl-8 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {['info', 'warning', 'error', 'debug'].map((sev) => (
              <Button
                key={sev}
                variant={selectedSeverity === sev ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setSelectedSeverity(selectedSeverity === sev ? null : sev)}
              >
                {sev}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[500px]">
          <div className="font-mono text-xs">
            {filtered.map((log) => (
              <div
                key={log.id}
                className={cn(
                  'flex items-start gap-3 px-2 md:px-4 py-1 md:py-1.5 border-b border-border/50 hover:bg-muted/50 transition-colors duration-500',
                  severityBg[log.severity],
                  newLogIds.has(log.id) && 'bg-yellow-500/10'
                )}
              >
                <span className="text-muted-foreground shrink-0 w-20">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={cn('shrink-0 w-14 uppercase font-medium', severityColors[log.severity])}>
                  {log.severity}
                </span>
                <span className="hidden md:inline shrink-0 w-32 text-muted-foreground truncate">{log.type}</span>
                <span className="flex-1 truncate">{log.message}</span>
                {log.sessionId && (
                  <span className="shrink-0 text-muted-foreground">{log.sessionId}</span>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
