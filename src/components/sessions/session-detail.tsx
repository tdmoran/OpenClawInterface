'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusDot } from '@/components/shared/status-dot';
import { JsonViewer } from '@/components/shared/json-viewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Coins, MessageSquare, Wrench, Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Session } from '@/types/session';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/use-mounted';

interface SessionDetailProps {
  session: Session;
}

const mockTraceTimeline = [
  { id: 't1', type: 'user_message', label: 'User Message', duration: 0, content: 'Can you help me refactor this function?', time: 0 },
  { id: 't2', type: 'reasoning', label: 'Reasoning', duration: 1200, content: 'Analyzing the function structure and identifying refactoring opportunities. The function has several code smells including long parameter list and duplicated logic.', time: 100 },
  { id: 't3', type: 'tool_call', label: 'code-edit', duration: 800, content: '{ "file": "src/utils.ts", "action": "edit", "lines": "42-68" }', time: 1300 },
  { id: 't4', type: 'tool_result', label: 'Tool Result', duration: 0, content: 'File edited successfully — 27 lines modified, 4 lines added', time: 2100 },
  { id: 't5', type: 'reasoning', label: 'Reasoning', duration: 600, content: 'Verifying the changes compile correctly and the test suite passes.', time: 2200 },
  { id: 't6', type: 'assistant_message', label: 'Response', duration: 400, content: 'I\'ve refactored the function to use a builder pattern, reducing the parameter count from 8 to 2.', time: 2800 },
];

const typeColors: Record<string, string> = {
  user_message: 'bg-blue-500',
  assistant_message: 'bg-emerald-500',
  reasoning: 'bg-violet-500',
  tool_call: 'bg-amber-500',
  tool_result: 'bg-cyan-500',
  error: 'bg-red-500',
};

export function SessionDetail({ session }: SessionDetailProps) {
  const mounted = useMounted();
  const totalDuration = mockTraceTimeline[mockTraceTimeline.length - 1].time + mockTraceTimeline[mockTraceTimeline.length - 1].duration;

  // Expandable waterfall state
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  // Replay state
  const [replayIndex, setReplayIndex] = useState<number>(-1);
  const [isReplaying, setIsReplaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const stopReplay = useCallback(() => {
    setIsReplaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  const startReplay = useCallback(() => {
    setIsReplaying(true);
    setReplayIndex(0);
    intervalRef.current = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= mockTraceTimeline.length - 1) {
          stopReplay();
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
  }, [stopReplay]);

  const toggleReplay = useCallback(() => {
    if (isReplaying) {
      stopReplay();
    } else {
      if (replayIndex >= mockTraceTimeline.length - 1 || replayIndex < 0) {
        startReplay();
      } else {
        setIsReplaying(true);
        intervalRef.current = setInterval(() => {
          setReplayIndex((prev) => {
            if (prev >= mockTraceTimeline.length - 1) {
              stopReplay();
              return prev;
            }
            return prev + 1;
          });
        }, 1500);
      }
    }
  }, [isReplaying, replayIndex, startReplay, stopReplay]);

  const resetReplay = useCallback(() => {
    stopReplay();
    setReplayIndex(-1);
  }, [stopReplay]);

  const stepBack = useCallback(() => {
    stopReplay();
    setReplayIndex((prev) => Math.max(0, prev - 1));
  }, [stopReplay]);

  const stepForward = useCallback(() => {
    stopReplay();
    setReplayIndex((prev) => Math.min(mockTraceTimeline.length - 1, prev + 1));
  }, [stopReplay]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const isReplayActive = replayIndex >= 0;

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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Waterfall Timeline</CardTitle>
                {/* Replay controls */}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={stepBack} disabled={replayIndex <= 0}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleReplay}>
                    {isReplaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={stepForward} disabled={replayIndex >= mockTraceTimeline.length - 1}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetReplay}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  {isReplayActive && (
                    <span className="text-xs text-muted-foreground ml-1 font-mono">
                      {replayIndex + 1}/{mockTraceTimeline.length}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {mockTraceTimeline.map((trace, i) => {
                const isExpanded = expandedTrace === trace.id;
                const isCurrent = isReplayActive && replayIndex === i;
                const isFaded = isReplayActive && replayIndex !== i;

                return (
                  <div key={trace.id}>
                    <div
                      className={cn(
                        'flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1 transition-all hover:bg-muted/50',
                        isCurrent && 'ring-1 ring-primary bg-primary/5',
                        isFaded && 'opacity-20'
                      )}
                      onClick={() => setExpandedTrace(isExpanded ? null : trace.id)}
                    >
                      <span className="w-24 text-xs text-muted-foreground text-right shrink-0">{trace.label}</span>
                      <div className="flex-1 relative h-8 bg-muted rounded">
                        <div
                          className={`absolute h-full rounded ${typeColors[trace.type]} opacity-80`}
                          style={{
                            left: `${(trace.time / totalDuration) * 100}%`,
                            width: `${Math.max((trace.duration / totalDuration) * 100, 1)}%`,
                          }}
                        />
                      </div>
                      <span className="w-16 text-xs text-muted-foreground text-right shrink-0">
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
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trace" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Trace Tree</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {mockTraceTimeline.map((trace, i) => (
                  <div key={trace.id} className="flex items-start gap-2">
                    <div className="flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${typeColors[trace.type]}`} />
                      {i < mockTraceTimeline.length - 1 && <div className="w-px h-6 bg-border" />}
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
