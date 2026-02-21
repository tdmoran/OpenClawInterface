'use client';

import { use } from 'react';
import { AgentDetail } from '@/components/agents/agent-detail';
import { mockAgents } from '@/lib/mock-data';
import { notFound } from 'next/navigation';

interface AgentDetailPageProps {
  params: Promise<{ agentId: string }>;
}

export default function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { agentId } = use(params);
  const agent = mockAgents.find((a) => a.id === agentId);

  if (!agent) {
    notFound();
  }

  return <AgentDetail agent={agent} />;
}
