import type { AgentPhase } from '@/types/agent';

/** Ordered list of agent execution phases. */
export const AGENT_PHASES: AgentPhase[] = [
  'intake',
  'reasoning',
  'planning',
  'execution',
  'reflection',
];

/** Tailwind background-color classes for each phase. */
export const PHASE_COLORS: Record<AgentPhase, string> = {
  intake: 'bg-slate-400',
  reasoning: 'bg-blue-500',
  planning: 'bg-amber-500',
  execution: 'bg-violet-500',
  reflection: 'bg-emerald-500',
};
