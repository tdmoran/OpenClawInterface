'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusDot } from '@/components/shared/status-dot';
import { JsonViewer } from '@/components/shared/json-viewer';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Clock, Coins, Download, MessageSquare, Wrench } from 'lucide-react';
import { exportToJSON, exportToCSV, sessionCSVColumns } from '@/lib/export-utils';
import type { CSVColumn } from '@/lib/export-utils';
import Link from 'next/link';
import type { Session, Trace } from '@/types/session';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/use-mounted';

interface SessionDetailProps {
  session: Session;
}

const typeColors: Record<string, string> = {
  user_message: 'bg-blue-500',
  assistant_message: 'bg-emerald-500',
  reasoning: 'bg-violet-500',
  tool_call: 'bg-amber-500',
  tool_result: 'bg-cyan-500',
  error: 'bg-red-500',
};

function traceLabel(trace: Trace): string {
  if (trace.data.toolName) return trace.data.toolName;
  switch (trace.type) {
    case 'user_message': return 'User Message';
    case 'assistant_message': return 'Response';
    case 'reasoning': return 'Reasoning';
    case 'tool_call': return 'Tool Call';
    case 'tool_result': return 'Tool Result';
    case 'error': return 'Error';
    default: return trace.type;
  }
}

function traceContent(trace: Trace): string {
  return trace.data.content || trace.data.error || '';
}

const traceCSVColumns: CSVColumn<Trace>[] = [
  { header: 'Trace ID', accessor: (t) => t.id },
  { header: 'Session ID', accessor: (t) => t.sessionId },
  { header: 'Type', accessor: (t) => t.type },
  { header: 'Timestamp', accessor: (t) => new Date(t.timestamp).toISOString() },
  { header: 'Duration (ms)', accessor: (t) => t.duration ?? '' },
  { header: 'Label', accessor: (t) => traceLabel(t) },
  { header: 'Content', accessor: (t) => traceContent(t) },
  { header: 'Tool Name', accessor: (t) => t.data.toolName ?? '' },
  { header: 'Model', accessor: (t) => t.data.model ?? '' },
  { header: 'Error', accessor: (t) => t.data.error ?? '' },
];

export function SessionDetail({ session }: SessionDetailProps) {
  const mounted = useMounted();
  const traces = session.traces;
  const hasTraces = traces.length > 0;

  const timeline = useMemo(() => {
    if (!hasTraces) return [];
    const startTime = traces[0].timestamp;
    return traces.map((t) => ({
      id: t.id,
      type: t.type,
      label: traceLabel(t),
      content: traceContent(t),
      time: t.timestamp - startTime,
      duration: t.duration ?? 0,
    }));
  }, [traces, hasTraces]);

  const totalDuration = timeline.length > 0
    ? timeline[timeline.length - 1].time + timeline[timeline.length - 1].duration
    : 0;

  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/sessions">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-mono">{session.id}</h2>
            <StatusDot status={session.status} />
            <Badge variant={session.status === 'active' ? 'default' : session.status === 'error' ? 'destructive' : 'secondary'}>
              {session.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {session.agentName} via {session.channel} &middot; {session.model}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => exportToJSON(session, `session-${session.id}`)}
            >
              Session JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => exportToCSV([session], sessionCSVColumns, `session-${session.id}`)}
            >
              Session CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => exportToJSON(session.traces, `traces-${session.id}`)}
              disabled={session.traces.length === 0}
            >
              Traces JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => exportToCSV(session.traces, traceCSVColumns, `traces-${session.id}`)}
              disabled={session.traces.length === 0}
            >
              Traces CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-bold">{mounted ? formatDistanceToNow(session.startedAt) : '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Tokens</p>
              <p className="text-sm font-bold">{(session.tokenUsage.total / 1000).toFixed(1)}k</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Messages</p>
              <p className="text-sm font-bold">{session.messageCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Tool Calls</p>
              <p className="text-sm font-bold">{session.toolCallCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="trace">Trace Tree</TabsTrigger>
          <TabsTrigger value="tokens">Token Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Waterfall Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {timeline.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No trace data available for this session
                </div>
              ) : (
                timeline.map((trace) => {
                  const isExpanded = expandedTrace === trace.id;
                  return (
                    <div key={trace.id}>
                      <div
                        className={cn(
                          'flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1 transition-all hover:bg-muted/50',
                        )}
                        onClick={() => setExpandedTrace(isExpanded ? null : trace.id)}
                      >
                        <span className="w-16 md:w-24 text-xs text-muted-foreground text-right shrink-0">{trace.label}</span>
                        <div className="flex-1 relative h-8 bg-muted rounded">
                          <div
                            className={`absolute h-full rounded ${typeColors[trace.type]} opacity-80`}
                            style={{
                              left: `${totalDuration > 0 ? (trace.time / totalDuration) * 100 : 0}%`,
                              width: `${totalDuration > 0 ? Math.max((trace.duration / totalDuration) * 100, 1) : 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-12 md:w-16 text-xs text-muted-foreground text-right shrink-0">
                          {trace.duration}ms
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="ml-28 mr-20 mt-1 mb-2 rounded-lg border bg-muted/30 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[10px]">{trace.type}</Badge>
                            <span className="text-[10px] text-muted-foreground">Start: {trace.time}ms</span>
                            {trace.duration > 0 && (
                              <span className="text-[10px] text-muted-foreground">Duration: {trace.duration}ms</span>
                            )}
                          </div>
                          <p className="text-xs text-foreground">{trace.content}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trace" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Trace Tree</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No trace data available for this session
                </div>
              ) : (
                <div className="space-y-1">
                  {timeline.map((trace, i) => (
                    <div key={trace.id} className="flex items-start gap-2">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${typeColors[trace.type]}`} />
                        {i < timeline.length - 1 && <div className="w-px h-6 bg-border" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{trace.label}</span>
                          <Badge variant="outline" className="text-[10px]">{trace.type}</Badge>
                          {trace.duration > 0 && (
                            <span className="text-xs text-muted-foreground">{trace.duration}ms</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{trace.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Token Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer data={{
                prompt: session.tokenUsage.prompt,
                completion: session.tokenUsage.completion,
                total: session.tokenUsage.total,
                cost: `$${session.cost.toFixed(4)}`,
                model: session.model,
              }} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
