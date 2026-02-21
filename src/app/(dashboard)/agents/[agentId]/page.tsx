'use client';

import { use } from 'react';
import { AgentDetail } from '@/components/agents/agent-detail';
import { mockAgents } from '@/lib/mock-data';
import { useAgentsStore } from '@/stores/agents-store';
import { notFound } from 'next/navigation';

interface AgentDetailPageProps {
  params: Promise<{ agentId: string }>;
}

export default function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { agentId } = use(params);
  const storeAgent = useAgentsStore((s) => s.agents.get(agentId));
  const agent = storeAgent ?? mockAgents.find((a) => a.id === agentId);

  if (!agent) {
    notFound();
  }

  return <AgentDetail agent={agent} />;
}
