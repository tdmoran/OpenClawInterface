'use client';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusDot } from '@/components/shared/status-dot';
import { cn } from '@/lib/utils';
import type { Session } from '@/types/session';

interface SessionComparisonProps {
  sessionA: Session;
  sessionB: Session;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  completed: 'secondary',
  error: 'destructive',
  timeout: 'outline',
};

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString();
}

function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

function getDuration(session: Session): number | null {
  if (!session.endedAt) return null;
  return session.endedAt - session.startedAt;
}

function pctDiff(a: number, b: number): string | null {
  if (a === 0 && b === 0) return null;
  if (a === 0) return '+100%';
  const diff = ((b - a) / a) * 100;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}%`;
}

/**
 * For metrics where lower is better (tokens, cost, duration), the session
 * with the lower value gets the "better" highlight.
 */
function lowerIsBetter(a: number, b: number): { aCls: string; bCls: string } {
  if (a === b) return { aCls: '', bCls: '' };
  return a < b
    ? { aCls: 'text-emerald-600 dark:text-emerald-400', bCls: 'text-red-600 dark:text-red-400' }
    : { aCls: 'text-red-600 dark:text-red-400', bCls: 'text-emerald-600 dark:text-emerald-400' };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function ComparisonRow({
  label,
  valueA,
  valueB,
  diffText,
  highlightA,
  highlightB,
}: {
  label: string;
  valueA: React.ReactNode;
  valueB: React.ReactNode;
  diffText?: string | null;
  highlightA?: string;
  highlightB?: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(0,2fr)_minmax(0,2fr)] gap-1 md:gap-4 py-2.5 px-3 rounded-md hover:bg-muted/40 transition-colors">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide md:self-center">
        {label}
      </div>
      <div className={cn('text-sm font-mono', highlightA)}>
        {valueA}
      </div>
      <div className={cn('text-sm font-mono flex items-center gap-2', highlightB)}>
        {valueB}
        {diffText && (
          <span className="text-xs text-muted-foreground font-normal">({diffText})</span>
        )}
      </div>
    </div>
  );
}

function TokenBar({
  label,
  valueA,
  valueB,
}: {
  label: string;
  valueA: number;
  valueB: number;
}) {
  const max = Math.max(valueA, valueB, 1);
  const pctA = (valueA / max) * 100;
  const pctB = (valueB / max) * 100;
  const diff = pctDiff(valueA, valueB);
  const { aCls, bCls } = lowerIsBetter(valueA, valueB);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {diff && <span className="text-xs text-muted-foreground">{diff}</span>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Session A bar */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Session A</span>
            <span className={cn('font-mono', aCls)}>{valueA.toLocaleString()}</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${pctA}%` }}
            />
          </div>
        </div>
        {/* Session B bar */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Session B</span>
            <span className={cn('font-mono', bCls)}>{valueB.toLocaleString()}</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{ width: `${pctB}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function SessionComparison({ sessionA, sessionB }: SessionComparisonProps) {
  const durA = getDuration(sessionA);
  const durB = getDuration(sessionB);
  const durHighlight = durA != null && durB != null ? lowerIsBetter(durA, durB) : { aCls: '', bCls: '' };
  const costHighlight = lowerIsBetter(sessionA.cost, sessionB.cost);
  const msgHighlight = lowerIsBetter(sessionA.messageCount, sessionB.messageCount);
  const toolHighlight = lowerIsBetter(sessionA.toolCallCount, sessionB.toolCallCount);
  const traceHighlight = lowerIsBetter(sessionA.traces.length, sessionB.traces.length);

  return (
    <div className="space-y-6">
      {/* Session identifiers header */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(0,2fr)_minmax(0,2fr)] gap-1 md:gap-4 px-3">
        <div />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" aria-hidden="true" />
            <span className="text-sm font-semibold">Session A</span>
          </div>
          <p className="font-mono text-xs text-muted-foreground truncate" title={sessionA.id}>
            {sessionA.id}
          </p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-violet-500" aria-hidden="true" />
            <span className="text-sm font-semibold">Session B</span>
          </div>
          <p className="font-mono text-xs text-muted-foreground truncate" title={sessionB.id}>
            {sessionB.id}
          </p>
        </div>
      </div>

      <Separator />

      {/* General info */}
      <section aria-label="General information">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-3">
          General
        </h4>
        <div className="divide-y divide-border/50">
          <ComparisonRow
            label="Agent"
            valueA={sessionA.agentName}
            valueB={sessionB.agentName}
          />
          <ComparisonRow
            label="Model"
            valueA={sessionA.model}
            valueB={sessionB.model}
          />
          <ComparisonRow
            label="Channel"
            valueA={sessionA.channel}
            valueB={sessionB.channel}
          />
          <ComparisonRow
            label="Status"
            valueA={
              <div className="flex items-center gap-1.5">
                <StatusDot status={sessionA.status} size="sm" />
                <Badge variant={statusVariant[sessionA.status]} className="text-xs">{sessionA.status}</Badge>
              </div>
            }
            valueB={
              <div className="flex items-center gap-1.5">
                <StatusDot status={sessionB.status} size="sm" />
                <Badge variant={statusVariant[sessionB.status]} className="text-xs">{sessionB.status}</Badge>
              </div>
            }
          />
        </div>
      </section>

      <Separator />

      {/* Timing */}
      <section aria-label="Timing">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-3">
          Timing
        </h4>
        <div className="divide-y divide-border/50">
          <ComparisonRow
            label="Started"
            valueA={fmtDate(sessionA.startedAt)}
            valueB={fmtDate(sessionB.startedAt)}
          />
          <ComparisonRow
            label="Ended"
            valueA={sessionA.endedAt ? fmtDate(sessionA.endedAt) : <span className="text-muted-foreground italic">In progress</span>}
            valueB={sessionB.endedAt ? fmtDate(sessionB.endedAt) : <span className="text-muted-foreground italic">In progress</span>}
          />
          <ComparisonRow
            label="Duration"
            valueA={durA != null ? fmtDuration(durA) : <span className="text-muted-foreground italic">N/A</span>}
            valueB={durB != null ? fmtDuration(durB) : <span className="text-muted-foreground italic">N/A</span>}
            diffText={durA != null && durB != null ? pctDiff(durA, durB) : null}
            highlightA={durHighlight.aCls}
            highlightB={durHighlight.bCls}
          />
        </div>
      </section>

      <Separator />

      {/* Token Usage */}
      <section aria-label="Token usage comparison">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">
          Token Usage
        </h4>
        <div className="space-y-4 px-3">
          <TokenBar label="Prompt Tokens" valueA={sessionA.tokenUsage.prompt} valueB={sessionB.tokenUsage.prompt} />
          <TokenBar label="Completion Tokens" valueA={sessionA.tokenUsage.completion} valueB={sessionB.tokenUsage.completion} />
          <TokenBar label="Total Tokens" valueA={sessionA.tokenUsage.total} valueB={sessionB.tokenUsage.total} />
        </div>
      </section>

      <Separator />

      {/* Cost & Counts */}
      <section aria-label="Cost and counts">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-3">
          Cost &amp; Activity
        </h4>
        <div className="divide-y divide-border/50">
          <ComparisonRow
            label="Cost"
            valueA={`$${sessionA.cost.toFixed(4)}`}
            valueB={`$${sessionB.cost.toFixed(4)}`}
            diffText={pctDiff(sessionA.cost, sessionB.cost)}
            highlightA={costHighlight.aCls}
            highlightB={costHighlight.bCls}
          />
          <ComparisonRow
            label="Messages"
            valueA={sessionA.messageCount.toString()}
            valueB={sessionB.messageCount.toString()}
            diffText={pctDiff(sessionA.messageCount, sessionB.messageCount)}
            highlightA={msgHighlight.aCls}
            highlightB={msgHighlight.bCls}
          />
          <ComparisonRow
            label="Tool Calls"
            valueA={sessionA.toolCallCount.toString()}
            valueB={sessionB.toolCallCount.toString()}
            diffText={pctDiff(sessionA.toolCallCount, sessionB.toolCallCount)}
            highlightA={toolHighlight.aCls}
            highlightB={toolHighlight.bCls}
          />
          <ComparisonRow
            label="Traces"
            valueA={sessionA.traces.length.toString()}
            valueB={sessionB.traces.length.toString()}
            diffText={pctDiff(sessionA.traces.length, sessionB.traces.length)}
            highlightA={traceHighlight.aCls}
            highlightB={traceHighlight.bCls}
          />
        </div>
      </section>
    </div>
  );
}
