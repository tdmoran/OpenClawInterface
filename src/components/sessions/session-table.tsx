'use client';

import Link from 'next/link';
import { useState, useMemo, useCallback, memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusDot } from '@/components/shared/status-dot';
import { SessionComparison } from '@/components/sessions/session-comparison';
import { useGatewayDataStore } from '@/stores/gateway-data-store';
import { useConnectionStore } from '@/stores/connection-store';
import { Search, ChevronUp, ChevronDown, Download, GitCompareArrows, X, CheckSquare } from 'lucide-react';
import { exportToJSON, exportToCSV, sessionCSVColumns } from '@/lib/export-utils';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/use-mounted';
import type { Session } from '@/types/session';

const MAX_COMPARE = 2;

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  completed: 'secondary',
  error: 'destructive',
  timeout: 'outline',
};

type SortField = 'agent' | 'channel' | 'status' | 'tokens' | 'cost' | 'date';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'completed' | 'error' | 'timeout';
type DateRange = 'all' | 'today' | '7d' | '30d';

const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Error', value: 'error' },
  { label: 'Timeout', value: 'timeout' },
];

const dateRanges: { label: string; value: DateRange }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

function getDateCutoff(range: DateRange): number {
  const now = Date.now();
  switch (range) {
    case 'today': return now - 86400000;
    case '7d': return now - 86400000 * 7;
    case '30d': return now - 86400000 * 30;
    default: return 0;
  }
}

const SortableHead = memo(function SortableHead({
  label,
  field,
  currentField,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = field === currentField;
  const sortLabel = isActive
    ? `${label}, sorted ${currentDir === 'asc' ? 'ascending' : 'descending'}`
    : `Sort by ${label}`;
  return (
    <TableHead
      className={cn('cursor-pointer select-none hover:text-foreground transition-colors', className)}
      onClick={() => onSort(field)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSort(field); } }}
      tabIndex={0}
      role="columnheader"
      aria-sort={isActive ? (currentDir === 'asc' ? 'ascending' : 'descending') : undefined}
      aria-label={sortLabel}
    >
      <div className={cn('flex items-center gap-1', className?.includes('text-right') && 'justify-end')}>
        {label}
        {isActive ? (
          currentDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
        )}
      </div>
    </TableHead>
  );
});

/** Compute the Radix `checked` value for the "select all" header checkbox. */
function getSelectAllChecked(
  allVisibleSelected: boolean,
  someVisibleSelected: boolean,
  hasRows: boolean,
): boolean | 'indeterminate' {
  if (!hasRows) return false;
  if (allVisibleSelected) return true;
  if (someVisibleSelected) return 'indeterminate';
  return false;
}

export function SessionTable() {
  const mounted = useMounted();
  const connectionStatus = useConnectionStore((s) => s.status);
  const health = useGatewayDataStore((s) => s.health);
  const isConnected = connectionStatus === 'connected' && health !== null;

  const totalSessionCount = isConnected ? health.sessions.count : 0;

  const sessions: Session[] = useMemo(() => {
    if (!isConnected) return [];

    return health.sessions.recent.map((s) => ({
      id: s.key,
      agentId: s.key.split(':')[1] || 'main',
      agentName: 'Clawkins',
      channel: s.key.includes('cron') ? 'cron' : 'gateway',
      status: (s.age < 300000 ? 'active' : 'completed') as Session['status'],
      model: 'moonshot/kimi-k2.5',
      startedAt: s.updatedAt - s.age,
      endedAt: s.age < 300000 ? undefined : s.updatedAt,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      cost: 0,
      messageCount: 0,
      toolCallCount: 0,
      traces: [],
    }));
  }, [isConnected, health]);

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [tokenMin, setTokenMin] = useState('');
  const [tokenMax, setTokenMax] = useState('');

  const uniqueModels = useMemo(() => {
    const models = new Set(sessions.map((s) => s.model));
    return Array.from(models).sort();
  }, [sessions]);

  const hasActiveFilters =
    statusFilter !== 'all' ||
    dateRange !== 'all' ||
    modelFilter !== 'all' ||
    tokenMin !== '' ||
    tokenMax !== '' ||
    search !== '';

  const clearAllFilters = () => {
    setStatusFilter('all');
    setDateRange('all');
    setModelFilter('all');
    setTokenMin('');
    setTokenMax('');
    setSearch('');
  };

  // Selection state (shared by bulk ops and comparison)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('desc');
      return field;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const processed = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);
    const minTokens = tokenMin !== '' ? Number(tokenMin) : null;
    const maxTokens = tokenMax !== '' ? Number(tokenMax) : null;

    let result = sessions.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (s.startedAt < cutoff) return false;
      if (modelFilter !== 'all' && s.model !== modelFilter) return false;
      if (minTokens !== null && !Number.isNaN(minTokens) && s.tokenUsage.total < minTokens) return false;
      if (maxTokens !== null && !Number.isNaN(maxTokens) && s.tokenUsage.total > maxTokens) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.agentName.toLowerCase().includes(q) ||
          s.channel.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.model.toLowerCase().includes(q)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'agent': cmp = a.agentName.localeCompare(b.agentName); break;
        case 'channel': cmp = a.channel.localeCompare(b.channel); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'tokens': cmp = a.tokenUsage.total - b.tokenUsage.total; break;
        case 'cost': cmp = a.cost - b.cost; break;
        case 'date': cmp = a.startedAt - b.startedAt; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [sessions, search, sortField, sortDir, statusFilter, dateRange, modelFilter, tokenMin, tokenMax]);

  // Resolve selected sessions for comparison
  const selectedSessions = useMemo(() => {
    const ids = Array.from(selectedIds);
    return ids.map((id) => sessions.find((s) => s.id === id)).filter(Boolean) as Session[];
  }, [selectedIds, sessions]);

  const canCompare = selectedSessions.length === MAX_COMPARE;

  // Derived selection state for bulk ops
  const selectionCount = selectedIds.size;
  const hasSelection = selectionCount > 0;
  const allVisibleSelected = processed.length > 0 && processed.every((s) => selectedIds.has(s.id));
  const someVisibleSelected = processed.some((s) => selectedIds.has(s.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const s of processed) {
          next.delete(s.id);
        }
        return next;
      } else {
        const next = new Set(prev);
        for (const s of processed) {
          next.add(s.id);
        }
        return next;
      }
    });
  }, [allVisibleSelected, processed]);

  // Bulk export handlers
  const handleExportSelectedJSON = useCallback(() => {
    const selected = processed.filter((s) => selectedIds.has(s.id));
    exportToJSON(selected, `sessions-selected-${Date.now()}`);
  }, [processed, selectedIds]);

  const handleExportSelectedCSV = useCallback(() => {
    const selected = processed.filter((s) => selectedIds.has(s.id));
    exportToCSV(selected, sessionCSVColumns, `sessions-selected-${Date.now()}`);
  }, [processed, selectedIds]);

  const selectAllChecked = getSelectAllChecked(allVisibleSelected, someVisibleSelected, processed.length > 0);

  return (
    <div className="space-y-4">
      {/* Total session count */}
      {isConnected && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="text-xs font-mono">
            {totalSessionCount}
          </Badge>
          <span>total sessions tracked by gateway</span>
        </div>
      )}

      {/* Bulk actions toolbar */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          hasSelection ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span>{selectionCount} session{selectionCount !== 1 ? 's' : ''} selected</span>
          </div>
          <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
          <div className="flex flex-wrap items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Export Selected
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleExportSelectedJSON}>
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSelectedCSV}>
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canCompare && (
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setCompareOpen(true)}
                aria-label="Compare selected sessions"
              >
                <GitCompareArrows className="h-3.5 w-3.5 mr-1" />
                Compare
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={clearSelection}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {/* Status filter tabs */}
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Date range pills */}
        <div className="flex gap-1">
          {dateRanges.map((r) => (
            <button
              key={r.value}
              onClick={() => setDateRange(r.value)}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                r.value === dateRange
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Model filter */}
        {uniqueModels.length > 0 && (
          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger size="sm" className="h-7 text-xs px-2.5 w-auto min-w-[120px]" aria-label="Filter by model">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {uniqueModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Token range */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            placeholder="Min tokens"
            aria-label="Minimum token count"
            className="h-7 w-24 text-xs px-2"
            value={tokenMin}
            onChange={(e) => setTokenMin(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max tokens"
            aria-label="Maximum token count"
            className="h-7 w-24 text-xs px-2"
            value={tokenMax}
            onChange={(e) => setTokenMax(e.target.value)}
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2.5 text-muted-foreground"
            onClick={clearAllFilters}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => exportToJSON(processed, `sessions-${Date.now()}`)}
            >
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => exportToCSV(processed, sessionCSVColumns, `sessions-${Date.now()}`)}
            >
              Export CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search (right-aligned) */}
        <div className="relative w-full md:ml-auto md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search sessions..." aria-label="Search sessions" className="pl-8 h-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {processed.map((session) => {
          const isSelected = selectedIds.has(session.id);
          return (
            <div
              key={session.id}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                isSelected ? 'bg-primary/5 border-primary/30' : ''
              )}
            >
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(session.id)}
                  aria-label={`Select session ${session.id}`}
                  className="mt-0.5 shrink-0"
                />
                <Link
                  href={`/sessions/${session.id}`}
                  className="flex-1 min-w-0 hover:bg-muted/50 transition-colors rounded p-0.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-primary truncate">
                      {session.id.length > 20 ? `${session.id.slice(0, 20)}...` : session.id}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusDot status={session.status} size="sm" />
                      <Badge variant={statusVariant[session.status]} className="text-xs">{session.status}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-medium">{session.agentName}</span>
                    <Badge variant="outline" className="text-xs">{session.channel}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span className="truncate">{session.model}</span>
                    <span className="font-mono">{(session.tokenUsage.total / 1000).toFixed(1)}k tokens</span>
                    <span className="font-mono">${session.cost.toFixed(3)}</span>
                    <span>{mounted ? formatDistanceToNow(session.startedAt, { addSuffix: true }) : '—'}</span>
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
        {processed.length === 0 && (
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            No sessions found
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectAllChecked}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all sessions"
                />
              </TableHead>
              <TableHead>Session</TableHead>
              <SortableHead label="Agent" field="agent" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Channel" field="channel" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Status" field="status" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <TableHead className="hidden md:table-cell">Model</TableHead>
              <SortableHead label="Tokens" field="tokens" currentField={sortField} currentDir={sortDir} onSort={handleSort} className="hidden md:table-cell text-right" />
              <SortableHead label="Cost" field="cost" currentField={sortField} currentDir={sortDir} onSort={handleSort} className="hidden md:table-cell text-right" />
              <SortableHead label="Started" field="date" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {processed.map((session) => {
              const isSelected = selectedIds.has(session.id);
              return (
                <TableRow
                  key={session.id}
                  className={cn(
                    'cursor-pointer hover:bg-muted/50',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(session.id)}
                      aria-label={`Select session ${session.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link href={`/sessions/${session.id}`} className="font-mono text-xs text-primary hover:underline">
                      {session.id}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{session.agentName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{session.channel}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={session.status} size="sm" />
                      <Badge variant={statusVariant[session.status]} className="text-xs">{session.status}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{session.model}</TableCell>
                  <TableCell className="hidden md:table-cell text-right font-mono text-xs">
                    {(session.tokenUsage.total / 1000).toFixed(1)}k
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right font-mono text-xs">${session.cost.toFixed(3)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {mounted ? formatDistanceToNow(session.startedAt, { addSuffix: true }) : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
            {processed.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No sessions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Comparison Dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent
          className="sm:max-w-4xl max-h-[90vh] p-0 gap-0"
          aria-label="Session comparison"
        >
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Session Comparison</DialogTitle>
            <DialogDescription>
              Side-by-side comparison of two sessions — metrics highlighted in green are more favorable.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-10rem)] px-6 py-4">
            {selectedSessions.length === MAX_COMPARE && (
              <SessionComparison
                sessionA={selectedSessions[0]}
                sessionB={selectedSessions[1]}
              />
            )}
          </ScrollArea>
          <DialogFooter showCloseButton className="px-6 pb-6 pt-2" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
