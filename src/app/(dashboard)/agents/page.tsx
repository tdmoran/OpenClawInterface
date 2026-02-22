'use client';

import { useState, useMemo } from 'react';
import { AgentCard } from '@/components/agents/agent-card';
import { RunningAgentCard } from '@/components/agents/running-agent-card';
import { AgentCreateDialog } from '@/components/agents/agent-create-dialog';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { useConnectionStore } from '@/stores/connection-store';
import { useAgentsStore } from '@/stores/agents-store';
import { useModels } from '@/hooks/use-models';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, LayoutGrid, Cpu, Star, ArrowRight, Plus } from 'lucide-react';
import type { Agent } from '@/types/agent';

const isRunning = (status: string) =>
  status === 'thinking' || status === 'responding' || status === 'tool_calling';

const providerColors: Record<string, string> = {
  anthropic: 'bg-orange-500',
  moonshot: 'bg-violet-500',
  google: 'bg-blue-500',
  'openai-codex': 'bg-emerald-500',
};

function getProviderColor(modelId: string): string {
  const provider = modelId.split('/')[0];
  return providerColors[provider] || 'bg-slate-500';
}

function getModelDisplayName(modelId: string, alias: string | null): string {
  if (alias) return alias;
  const parts = modelId.split('/');
  return parts[parts.length - 1];
}

export default function AgentsPage() {
  const connectionStatus = useConnectionStore((s) => s.status);
  const health = useGatewayDataStore((s) => s.health);
  const { models: modelsConfig, primary } = useModels();
  const agentsMap = useAgentsStore((s) => s.agents);
  const storeAgents = useMemo(() => Array.from(agentsMap.values()), [agentsMap]);
  const isConnected = connectionStatus === 'connected' && health !== null;

  const [createOpen, setCreateOpen] = useState(false);

  const agents: Agent[] = useMemo(() => {
    // Merge gateway health agents with store agents
    let baseAgents: Agent[];

    if (!isConnected) {
      baseAgents = [];
    } else {
      baseAgents = health.agents.map((a) => ({
        id: a.agentId,
        name: a.agentId === 'main' ? 'Clawkins' : a.agentId,
        description: a.isDefault ? 'Default agent — routes through all available models' : 'Agent',
        model: primary || 'moonshot/kimi-k2.5',
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
    }

    // Merge in any agents from the store that are not already present
    const baseIds = new Set(baseAgents.map((a) => a.id));
    const additional = storeAgents.filter((a) => !baseIds.has(a.id));
    return [...baseAgents, ...additional];
  }, [isConnected, health, primary, storeAgents]);

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
                liveData={{}}
              />
            ))}
          </div>
        )}
      </section>

      {/* Available Models Section */}
      {isConnected && modelsConfig.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Available Models</h2>
            <Badge variant="secondary" className="text-xs">{modelsConfig.length}</Badge>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modelsConfig.map((model) => (
              <Card key={model.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${getProviderColor(model.id)}`} />
                      <CardTitle className="text-sm font-semibold">
                        {getModelDisplayName(model.id, model.alias)}
                      </CardTitle>
                    </div>
                    <div className="flex gap-1">
                      {model.isPrimary && (
                        <Badge className="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 text-[10px]">
                          <Star className="h-2.5 w-2.5 mr-0.5" />
                          Primary
                        </Badge>
                      )}
                      {model.isFallback && (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                          <ArrowRight className="h-2.5 w-2.5 mr-0.5" />
                          Fallback
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground font-mono">{model.id}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Agents Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Agents</h2>
          <p className="text-sm text-muted-foreground">{agents.length} configured</p>
          <div className="flex-1" />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Create Agent
          </Button>
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
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-3">
                {filteredAgents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Create Agent Dialog */}
      <AgentCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
