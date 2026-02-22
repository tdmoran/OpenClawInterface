'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  GitBranch,
  Activity,
  Bot,
  MessageSquare,
  Brain,
  Timer,
  Bell,
  Settings,
  Monitor,
  Search,
  ArrowRight,
  Hash,
  AlertCircle,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useSessionsStore } from '@/stores/sessions-store';
import { useAgentsStore } from '@/stores/agents-store';
import { useEventsStore } from '@/stores/events-store';

const navItems = [
  { href: '/dashboard', label: 'Homebase', icon: LayoutDashboard },
  { href: '/flow', label: 'Agent Flow', icon: GitBranch },
  { href: '/monitor', label: 'Monitor', icon: Activity },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/sessions', label: 'Sessions', icon: MessageSquare },
  { href: '/code-monitor', label: 'Code Monitor', icon: Monitor },
  { href: '/memory', label: 'Memory', icon: Brain },
  { href: '/cron', label: 'Cron Jobs', icon: Timer },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const sessions = useSessionsStore((s) => s.getSessions)();
  const agents = useAgentsStore((s) => s.getAgents)();
  const events = useEventsStore((s) => s.entries);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  // Show the most recent 10 events
  const recentEvents = events.slice(-10).reverse();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-2 rounded-md border bg-background px-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
        <CommandInput placeholder="Search pages, sessions, agents, events..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Navigation */}
          <CommandGroup heading="Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={`nav-${item.label}`}
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Sessions */}
          {sessions.length > 0 && (
            <>
              <CommandGroup heading="Sessions">
                {sessions.slice(0, 8).map((session) => (
                  <CommandItem
                    key={session.id}
                    value={`session-${session.id}-${session.status}-${session.agentName}`}
                    onSelect={() =>
                      runCommand(() => router.push(`/sessions/${session.id}`))
                    }
                  >
                    <Hash className="h-4 w-4" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{session.id.slice(0, 12)}</span>
                      <span className="text-xs text-muted-foreground">
                        {session.agentName} &middot; {session.status}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Agents */}
          {agents.length > 0 && (
            <>
              <CommandGroup heading="Agents">
                {agents.slice(0, 8).map((agent) => (
                  <CommandItem
                    key={agent.id}
                    value={`agent-${agent.name}-${agent.id}-${agent.status}`}
                    onSelect={() =>
                      runCommand(() => router.push(`/agents/${agent.id}`))
                    }
                  >
                    <Bot className="h-4 w-4" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{agent.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {agent.status} &middot; {agent.model}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Recent Events */}
          {recentEvents.length > 0 && (
            <CommandGroup heading="Recent Events">
              {recentEvents.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={`event-${entry.id}-${entry.type}-${entry.message}`}
                  onSelect={() =>
                    runCommand(() => router.push('/monitor'))
                  }
                >
                  <AlertCircle className="h-4 w-4" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm truncate max-w-[400px]">
                      {entry.message}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.type} &middot; {entry.severity}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
