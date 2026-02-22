'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/shared/status-dot';
import { CodeBlock } from '@/components/shared/code-block';
import { SkillToggleList } from '@/components/agents/skill-toggle-list';
import { ModelReassignSelect } from '@/components/agents/model-reassign-select';
import { AgentEditDialog } from '@/components/agents/agent-edit-dialog';
import { AgentDeleteDialog } from '@/components/agents/agent-delete-dialog';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { useConnectionStore } from '@/stores/connection-store';
import { useEventsStore } from '@/stores/events-store';
import { useMounted } from '@/hooks/use-mounted';
import type { Agent, AgentPhase } from '@/types/agent';
import type { LogEntry } from '@/types/events';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Heart,
  Activity,
  Clock,
  Zap,
  Hash,
  Gauge,
  CheckCircle,
  AlertCircle,
  Timer,
  Coins,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AgentDetailProps {
  agent: Agent;
  agentId: string;
}

const phases: AgentPhase[] = ['intake', 'reasoning', 'planning', 'execution', 'reflection'];

const phaseColors: Record<AgentPhase, string> = {
  intake: 'bg-slate-400',
  reasoning: 'bg-blue-500',
  planning: 'bg-amber-500',
  execution: 'bg-violet-500',
  reflection: 'bg-emerald-500',
};

const severityColors: Record<string, string> = {
  info: 'text-blue-600 dark:text-blue-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
  debug: 'text-muted-foreground',
};

const severityBg: Record<string, string> = {
  info: 'bg-blue-500/10',
  warning: 'bg-amber-500/10',
  error: 'bg-red-500/10',
  debug: 'bg-muted',
};

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function AgentDetail({ agent, agentId }: AgentDetailProps) {
  const router = useRouter();
  const mounted = useMounted();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Gateway health data
  const health = useGatewayDataStore((s) => s.health);
  const connectionStatus = useConnectionStore((s) => s.status);
  const isConnected = connectionStatus === 'connected';

  // Find this agent in gateway health
  const healthAgent = useMemo(
    () => health?.agents.find((a) => a.agentId === agentId),
    [health, agentId],
  );

  // Recent events for this agent
  const allEntries = useEventsStore((s) => s.entries);
  const agentEvents = useMemo(() => {
    const filtered = allEntries.filter((e) => e.agentId === agentId);
    // Return most recent 50, reversed so newest is first
    return filtered.slice(-50).reverse();
  }, [allEntries, agentId]);

  // Phase change events for timeline
  const phaseEvents = useMemo(() => {
    return agentEvents
      .filter((e) => e.type === 'agent.phase_change')
      .slice(0, 10);
  }, [agentEvents]);

  const currentPhaseIdx = agent.currentPhase ? phases.indexOf(agent.currentPhase) : -1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agents">
          <Button variant="ghost" size="icon" className="h-9 w-9 md:h-8 md:w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <StatusDot status={agent.status} size="lg" />
          <div>
            <h2 className="text-xl font-bold">{agent.name}</h2>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </div>
        </div>
        <ModelReassignSelect agent={agent} />
        <Badge variant={agent.status === 'idle' ? 'secondary' : 'default'}>
          {agent.status}
        </Badge>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {[
          { label: 'Sessions', value: agent.stats.totalSessions, icon: Hash },
          { label: 'Total Tokens', value: formatTokenCount(agent.stats.totalTokens), icon: Zap },
          { label: 'Total Cost', value: `$${agent.stats.totalCost.toFixed(2)}`, icon: Coins },
          { label: 'Avg Response', value: `${agent.stats.avgResponseTime.toFixed(1)}s`, icon: Timer },
          { label: 'Success Rate', value: `${(agent.stats.successRate * 100).toFixed(0)}%`, icon: CheckCircle },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-1.5 mb-1">
                <stat.icon className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <p className="text-xl font-bold tabular-nums">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Health & Performance section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gateway Health Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Gateway Health</CardTitle>
            </div>
            <CardDescription>
              Live status from the connected gateway
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Connection</span>
              <div className="flex items-center gap-1.5">
                <StatusDot status={isConnected ? 'connected' : 'disconnected'} />
                <span className={cn(
                  'text-xs font-medium',
                  isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                )}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Gateway Status</span>
              <div className="flex items-center gap-1.5">
                {health ? (
                  <>
                    <StatusDot status={health.ok ? 'healthy' : 'degraded'} />
                    <span className="text-xs font-medium">
                      {health.ok ? 'Healthy' : 'Degraded'}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Active Sessions</span>
              <span className="font-medium">
                {healthAgent ? healthAgent.sessions.count : (health?.sessions.count ?? '--')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Heartbeat</span>
              <span className="text-xs">
                {healthAgent?.heartbeat?.enabled
                  ? `Every ${healthAgent.heartbeat.every}`
                  : healthAgent
                    ? 'Disabled'
                    : '--'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Default Agent</span>
              <span className="text-xs">
                {healthAgent ? (healthAgent.isDefault ? 'Yes' : 'No') : '--'}
              </span>
            </div>
            {health && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Health Check Latency</span>
                <span className="text-xs font-mono tabular-nums">{health.durationMs}ms</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Performance Metrics</CardTitle>
            </div>
            <CardDescription>
              Aggregate statistics for this agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Token Usage</span>
              <span className="font-medium font-mono tabular-nums">
                {formatTokenCount(agent.stats.totalTokens)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Avg Response Time</span>
              <div className="flex items-center gap-1.5">
                <span className="font-medium font-mono tabular-nums">
                  {agent.stats.avgResponseTime.toFixed(1)}s
                </span>
                {agent.stats.avgResponseTime > 0 && agent.stats.avgResponseTime <= 2 && (
                  <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400">Fast</Badge>
                )}
                {agent.stats.avgResponseTime > 2 && agent.stats.avgResponseTime <= 5 && (
                  <Badge variant="secondary" className="text-[10px] text-amber-600 dark:text-amber-400">Normal</Badge>
                )}
                {agent.stats.avgResponseTime > 5 && (
                  <Badge variant="secondary" className="text-[10px] text-red-600 dark:text-red-400">Slow</Badge>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Session Count</span>
              <span className="font-medium tabular-nums">
                {agent.stats.totalSessions}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Success Rate</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      agent.stats.successRate >= 0.95 ? 'bg-emerald-500' :
                      agent.stats.successRate >= 0.8 ? 'bg-amber-500' : 'bg-red-500',
                    )}
                    style={{ width: `${agent.stats.successRate * 100}%` }}
                  />
                </div>
                <span className="font-medium font-mono tabular-nums text-xs">
                  {(agent.stats.successRate * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Cost</span>
              <span className="font-medium font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                ${agent.stats.totalCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Last Active</span>
              <span className="text-xs">
                {mounted && agent.lastActiveAt > 0
                  ? formatDistanceToNow(agent.lastActiveAt, { addSuffix: true })
                  : '--'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase Timeline */}
      {agent.currentPhase && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Phase Progress</CardTitle>
            </div>
            <CardDescription>
              Current execution phase and recent transitions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phase bar */}
            <div className="space-y-2">
              <div className="flex gap-1">
                {phases.map((phase, i) => (
                  <div
                    key={phase}
                    className={cn(
                      'h-2 flex-1 rounded-full transition-colors',
                      i <= currentPhaseIdx ? phaseColors[phase] : 'bg-muted',
                      i === currentPhaseIdx && 'animate-pulse',
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                {phases.map((p) => (
                  <span
                    key={p}
                    className={cn(p === agent.currentPhase && 'text-foreground font-medium')}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </span>
                ))}
              </div>
            </div>

            {/* Phase change history */}
            {phaseEvents.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t">
                <p className="text-xs text-muted-foreground font-medium mb-2">Recent Phase Changes</p>
                {phaseEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground font-mono tabular-nums shrink-0">
                      {mounted ? format(event.timestamp, 'HH:mm:ss') : '--:--:--'}
                    </span>
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="truncate">{event.message}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs: Overview, Config, Skills, Activity */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="activity">
            Activity
            {agentEvents.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                {agentEvents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span>{agent.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Tokens</span>
                <span>{agent.config.maxTokens}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Temperature</span>
                <span>{agent.config.temperature}</span>
              </div>
              {agent.currentPhase && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Phase</span>
                  <Badge variant="outline">{agent.currentPhase}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4 mt-4">
          {agent.config.soulMd && (
            <Card>
              <CardHeader><CardTitle className="text-sm">SOUL.md</CardTitle></CardHeader>
              <CardContent>
                <CodeBlock code={agent.config.soulMd} language="markdown" showLineNumbers />
              </CardContent>
            </Card>
          )}
          {agent.config.agentsMd && (
            <Card>
              <CardHeader><CardTitle className="text-sm">AGENTS.md</CardTitle></CardHeader>
              <CardContent>
                <CodeBlock code={agent.config.agentsMd} language="markdown" showLineNumbers />
              </CardContent>
            </Card>
          )}
          {agent.config.toolsMd && (
            <Card>
              <CardHeader><CardTitle className="text-sm">TOOLS.md</CardTitle></CardHeader>
              <CardContent>
                <CodeBlock code={agent.config.toolsMd} language="markdown" showLineNumbers />
              </CardContent>
            </Card>
          )}
          {!agent.config.soulMd && !agent.config.agentsMd && !agent.config.toolsMd && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">No configuration files available</p>
              <p className="text-xs text-muted-foreground mt-1">
                SOUL.md, AGENTS.md, and TOOLS.md will appear here when configured
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          <SkillToggleList agent={agent} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Recent Activity</CardTitle>
              </div>
              <CardDescription>
                Events associated with this agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agentEvents.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Events will appear here as the agent processes requests
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-3">
                  <div className="space-y-1">
                    {agentEvents.map((event) => (
                      <AgentEventRow key={event.id} event={event} mounted={mounted} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AgentEditDialog agent={agent} open={editOpen} onOpenChange={setEditOpen} />
      <AgentDeleteDialog
        agent={agent}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push('/agents')}
      />
    </div>
  );
}

/** Compact row for a single agent event. */
function AgentEventRow({ event, mounted }: { event: LogEntry; mounted: boolean }) {
  const color = severityColors[event.severity] ?? 'text-muted-foreground';
  const bg = severityBg[event.severity] ?? 'bg-muted';
  const Icon = event.severity === 'error' ? AlertCircle : event.severity === 'warning' ? AlertCircle : Clock;

  return (
    <div className="flex items-start gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors text-xs group">
      <div className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded', bg)}>
        <Icon className={cn('h-3 w-3', color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
            {event.type}
          </Badge>
          {event.sessionId && (
            <span className="text-muted-foreground truncate">
              session: {event.sessionId.slice(0, 8)}
            </span>
          )}
        </div>
        <p className="text-foreground mt-0.5 break-words">{event.message}</p>
      </div>
      <span className="text-muted-foreground font-mono tabular-nums shrink-0">
        {mounted ? format(event.timestamp, 'HH:mm:ss') : '--:--:--'}
      </span>
    </div>
  );
}
