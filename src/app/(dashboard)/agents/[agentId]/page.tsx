import { AgentDetail } from '@/components/agents/agent-detail';
import { mockAgents } from '@/lib/mock-data';
import { notFound } from 'next/navigation';

interface AgentDetailPageProps {
  params: Promise<{ agentId: string }>;
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { agentId } = await params;
  const agent = mockAgents.find((a) => a.id === agentId);

  if (!agent) {
    notFound();
  }

  return <AgentDetail agent={agent} />;
}
