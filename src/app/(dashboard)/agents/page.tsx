import { AgentCard } from '@/components/agents/agent-card';
import { mockAgents } from '@/lib/mock-data';

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">All Agents</h2>
          <p className="text-sm text-muted-foreground">{mockAgents.length} agents configured</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
