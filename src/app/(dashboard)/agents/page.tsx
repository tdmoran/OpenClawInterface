'use client';

import { useState, useMemo } from 'react';
import { AgentCard } from '@/components/agents/agent-card';
import { RunningAgentCard } from '@/components/agents/running-agent-card';
import { mockAgents, mockAgentLiveData } from '@/lib/mock-data';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { useConnectionStore } from '@/stores/connection-store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Zap, LayoutGrid } from 'lucide-react';
import type { Agent } from '@/types/agent';

const isRunning = (status: string) =>
  status === 'thinking' || status === 'responding' || status === 'tool_calling';

export default function AgentsPage() {
  const connectionStatus = useConnectionStore((s) => s.status);
  const health = useGatewayDataStore((s) => s.health);
  const isConnected = connectionStatus === 'connected' && health !== null;

  const agents: Agent[] = useMemo(() => {
    if (!isConnected) return mockAgents;

    return health.agents.map((a) => ({
      id: a.agentId,
      name: a.agentId === 'main' ? 'Clawkins' : a.agentId,
      description: a.isDefault ? 'Default agent' : 'Agent',
      model: 'moonshot/kimi-k2.5',
      status: 'idle' as const,
      skills: [],
      config: {} as Agent['config'],
      stats: {
        totalSessions: a.sessions.count,
        totalTokens: 0,
        totalCost: 0,
        avgResponseTime: 0,
        successRate: 0,
      },
      createdAt: Date.now(),
      lastActiveAt: health.sessions.recent[0]?.updatedAt || Date.now(),
    }));
  }, [isConnected, health]);

  const runningAgents = agents.filter((a) => isRunning(a.status));
  const [filter, setFilter] = useState('all');

  const filteredAgents = agents.filter((agent) => {
    if (filter === 'all') return true;
    if (filter === 'running') return isRunning(agent.status);
    if (filter === 'idle') return agent.status === 'idle';
    if (filter === 'offline') return agent.status === 'offline' || agent.status === 'error';
    return true;
  });

  const counts = {
    all: agents.length,
    running: agents.filter((a) => isRunning(a.status)).length,
    idle: agents.filter((a) => a.status === 'idle').length,
    offline: agents.filter((a) => a.status === 'offline' || a.status === 'error').length,
  };

  return (
    <div className="space-y-8">
      {/* Running Now Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-500" />
          <h2 className="text-lg font-semibold">Running Now</h2>
          <Badge variant="secondary" className="text-xs">
            {runningAgents.length}
          </Badge>
        </div>

        {runningAgents.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No agents running</p>
            <p className="text-xs text-muted-foreground mt-1">
              Active agents will appear here with live token usage
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {runningAgents.map((agent) => (
              <RunningAgentCard
                key={agent.id}
                agent={agent}
                liveData={mockAgentLiveData[agent.id] ?? {}}
              />
            ))}
          </div>
        )}
      </section>

      {/* Available Agents Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Available Agents</h2>
          <p className="text-sm text-muted-foreground">{agents.length} configured</p>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="running">Running ({counts.running})</TabsTrigger>
            <TabsTrigger value="idle">Idle ({counts.idle})</TabsTrigger>
            <TabsTrigger value="offline">Offline ({counts.offline})</TabsTrigger>
          </TabsList>

          <TabsContent value={filter}>
            {filteredAgents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">No agents match this filter</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-3">
                {filteredAgents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
