'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/shared/status-dot';
import type { Agent } from '@/types/agent';
import { Bot, Wrench, Clock, Coins } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.id}`}>
      <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{agent.model}</p>
              </div>
            </div>
            <StatusDot status={agent.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {agent.skills.slice(0, 3).map((skill) => (
              <Badge key={skill.id} variant="secondary" className="text-[10px]">
                {skill.name}
              </Badge>
            ))}
            {agent.skills.length > 3 && (
              <Badge variant="secondary" className="text-[10px]">+{agent.skills.length - 3}</Badge>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Wrench className="h-3 w-3" />
              <span>{agent.stats.totalSessions} sessions</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Coins className="h-3 w-3" />
              <span>${agent.stats.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDistanceToNow(agent.lastActiveAt, { addSuffix: true })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
