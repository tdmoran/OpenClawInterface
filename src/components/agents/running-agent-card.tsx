'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/shared/status-dot';
import type { Agent, AgentPhase } from '@/types/agent';
import type { AgentLiveData } from '@/lib/mock-data';
import { useLiveTokens } from '@/hooks/use-live-tokens';
import { Bot, Coins, Hash, Clock, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useMounted } from '@/hooks/use-mounted';

interface RunningAgentCardProps {
  agent: Agent;
  liveData: AgentLiveData;
}

const phases: AgentPhase[] = ['intake', 'reasoning', 'planning', 'execution', 'reflection'];

const phaseColors: Record<AgentPhase, string> = {
  intake: 'bg-slate-400',
  reasoning: 'bg-blue-500',
  planning: 'bg-amber-500',
  execution: 'bg-violet-500',
  reflection: 'bg-emerald-500',
};

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function RunningAgentCard({ agent, liveData }: RunningAgentCardProps) {
  const initialTokens = liveData.liveTokenUsage ?? { prompt: 0, completion: 0, total: 0 };
  const { tokens, cost } = useLiveTokens(initialTokens, agent.model, true);
  const mounted = useMounted();

  const currentPhaseIdx = agent.currentPhase ? phases.indexOf(agent.currentPhase) : 0;

  return (
    <Link href={`/agents/${agent.id}`}>
      <Card className="border-blue-500/50 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all cursor-pointer relative overflow-hidden">
        {/* Animated top border accent */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500 animate-pulse" />

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15">
                <Bot className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">{agent.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{agent.model}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot status={agent.status} size="lg" />
              <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">
                {agent.status === 'tool_calling' ? 'Tool Calling' : agent.status === 'thinking' ? 'Thinking' : 'Responding'}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Phase progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Phase</span>
              <span className="font-medium capitalize">{agent.currentPhase ?? 'intake'}</span>
            </div>
            <div className="flex gap-1">
              {phases.map((phase, i) => (
                <div
                  key={phase}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i <= currentPhaseIdx ? phaseColors[phase] : 'bg-muted',
                    i === currentPhaseIdx && 'animate-pulse',
                  )}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              {phases.map((p) => (
                <span key={p} className={cn(p === agent.currentPhase && 'text-foreground font-medium')}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </span>
              ))}
            </div>
          </div>

          {/* Live token counters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/50 p-2.5 space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ArrowUpRight className="h-3 w-3" />
                Prompt
              </div>
              <p className="text-sm font-mono font-semibold tabular-nums">{formatTokenCount(tokens.prompt)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ArrowDownLeft className="h-3 w-3" />
                Completion
              </div>
              <p className="text-sm font-mono font-semibold tabular-nums">{formatTokenCount(tokens.completion)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Coins className="h-3 w-3" />
                Cost
              </div>
              <p className="text-sm font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                ${cost.toFixed(3)}
              </p>
            </div>
          </div>

          {/* Active session info + current tool */}
          <div className="flex items-center justify-between text-xs border-t pt-3">
            {liveData.activeSession && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    <span>{liveData.activeSession.channel}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{mounted ? formatDistanceToNow(liveData.activeSession.startedAt) : '—'}</span>
                  </div>
                  <span className="text-muted-foreground">{liveData.activeSession.messageCount} msgs</span>
                </div>
              </>
            )}
            {liveData.currentTool && (
              <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="font-medium">{liveData.currentTool}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
