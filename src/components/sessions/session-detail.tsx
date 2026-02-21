'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusDot } from '@/components/shared/status-dot';
import { JsonViewer } from '@/components/shared/json-viewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Coins, MessageSquare, Wrench } from 'lucide-react';
import Link from 'next/link';
import type { Session } from '@/types/session';
import { formatDistanceToNow } from 'date-fns';

interface SessionDetailProps {
  session: Session;
}

const mockTraceTimeline = [
  { id: 't1', type: 'user_message', label: 'User Message', duration: 0, content: 'Can you help me refactor this function?', time: 0 },
  { id: 't2', type: 'reasoning', label: 'Reasoning', duration: 1200, content: 'Analyzing the function structure...', time: 100 },
  { id: 't3', type: 'tool_call', label: 'code-edit', duration: 800, content: '{ "file": "src/utils.ts", "action": "edit" }', time: 1300 },
  { id: 't4', type: 'tool_result', label: 'Tool Result', duration: 0, content: 'File edited successfully', time: 2100 },
  { id: 't5', type: 'reasoning', label: 'Reasoning', duration: 600, content: 'Verifying the changes...', time: 2200 },
  { id: 't6', type: 'assistant_message', label: 'Response', duration: 400, content: 'I\'ve refactored the function to use...', time: 2800 },
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
  const totalDuration = mockTraceTimeline[mockTraceTimeline.length - 1].time + mockTraceTimeline[mockTraceTimeline.length - 1].duration;

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
              <p className="text-sm font-bold">{formatDistanceToNow(session.startedAt)}</p>
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
            <CardContent className="space-y-2">
              {mockTraceTimeline.map((trace) => (
                <div key={trace.id} className="flex items-center gap-3">
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
              ))}
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
