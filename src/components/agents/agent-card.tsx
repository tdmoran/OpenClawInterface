'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/shared/status-dot';
import type { Agent } from '@/types/agent';
import { Bot, Wrench, Clock, Coins } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: Agent;
}

const statusLabel: Record<string, { text: string; className: string }> = {
  idle: { text: 'Idle', className: 'text-muted-foreground' },
  thinking: { text: 'Running', className: 'text-blue-600 dark:text-blue-400' },
  responding: { text: 'Running', className: 'text-blue-600 dark:text-blue-400' },
  tool_calling: { text: 'Running', className: 'text-violet-600 dark:text-violet-400' },
  error: { text: 'Error', className: 'text-red-600 dark:text-red-400' },
  offline: { text: 'Offline', className: 'text-muted-foreground' },
};

const isRunning = (status: string) =>
  status === 'thinking' || status === 'responding' || status === 'tool_calling';

const phaseLabel: Record<string, string> = {
  intake: 'Intake',
  reasoning: 'Reasoning',
  planning: 'Planning',
  execution: 'Execution',
  reflection: 'Reflection',
};

export function AgentCard({ agent }: AgentCardProps) {
  const running = isRunning(agent.status);
  const sl = statusLabel[agent.status] ?? statusLabel.idle;

  return (
    <Link href={`/agents/${agent.id}`}>
      <Card
        className={cn(
          'transition-all hover:shadow-md cursor-pointer',
          running
            ? 'border-blue-500/50 shadow-blue-500/10 shadow-md hover:shadow-blue-500/20'
            : 'hover:border-primary/50',
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  running ? 'bg-blue-500/15' : 'bg-primary/10',
                )}
              >
                <Bot className={cn('h-4 w-4', running ? 'text-blue-500' : 'text-primary')} />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{agent.model}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agent.currentPhase && (
                <Badge variant="outline" className="text-[10px]">
                  {phaseLabel[agent.currentPhase] ?? agent.currentPhase}
                </Badge>
              )}
              <div className="flex items-center gap-1.5">
                <StatusDot status={agent.status} />
                <span className={cn('text-xs font-medium', sl.className)}>{sl.text}</span>
              </div>
            </div>
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
