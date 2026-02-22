'use client';

import { use, useMemo } from 'react';
import { AgentDetail } from '@/components/agents/agent-detail';
import { AgentDetailSkeleton } from '@/components/agents/agent-detail-skeleton';
import { useAgentsStore } from '@/stores/agents-store';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { useConnectionStore } from '@/stores/connection-store';
import { useModels } from '@/hooks/use-models';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, WifiOff, Search } from 'lucide-react';
import Link from 'next/link';
import type { Agent } from '@/types/agent';

interface AgentDetailPageProps {
  params: Promise<{ agentId: string }>;
}

export default function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { agentId } = use(params);
  const connectionStatus = useConnectionStore((s) => s.status);
  const health = useGatewayDataStore((s) => s.health);
  const storeAgent = useAgentsStore((s) => s.agents.get(agentId));
  const { primary } = useModels();

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting' || connectionStatus === 'reconnecting';

  // Build agent from gateway health data if not in store
  const agent: Agent | undefined = useMemo(() => {
    if (storeAgent) return storeAgent;
    if (!health) return undefined;

    const healthAgent = health.agents.find((a) => a.agentId === agentId);
    if (!healthAgent) return undefined;

    return {
      id: healthAgent.agentId,
      name: healthAgent.agentId === 'main' ? 'Clawkins' : healthAgent.agentId,
      description: healthAgent.isDefault
        ? 'Default agent — routes through all available models'
        : 'Agent',
      model: primary || 'moonshot/kimi-k2.5',
      status: 'idle' as const,
      skills: [],
      config: {
        maxTokens: 4096,
        temperature: 0.7,
      },
      stats: {
        totalSessions: healthAgent.sessions.count,
        totalTokens: 0,
        totalCost: 0,
        avgResponseTime: 0,
        successRate: 0,
      },
      createdAt: health.ts || Date.now(),
      lastActiveAt: health.sessions.recent[0]?.updatedAt || health.ts || Date.now(),
    };
  }, [storeAgent, health, agentId, primary]);

  // Show skeleton while connecting
  if (isConnecting && !agent) {
    return <AgentDetailSkeleton />;
  }

  // Agent not found — show empty state with connection guidance
  if (!agent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/agents">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-xl font-bold">Agent Detail</h2>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            {!isConnected ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 mb-4">
                  <WifiOff className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No data available</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  The gateway is not connected. Agent data for <strong>{agentId}</strong> will
                  appear here once the connection is established.
                </p>
                <p className="text-xs text-muted-foreground">
                  Check your gateway configuration in{' '}
                  <Link href="/settings" className="underline underline-offset-2 hover:text-foreground">
                    Settings
                  </Link>
                </p>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Agent not found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  No agent with ID <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{agentId}</code> was
                  found in the connected gateway.
                </p>
                <Link href="/agents">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Agents
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AgentDetail agent={agent} agentId={agentId} />;
}
