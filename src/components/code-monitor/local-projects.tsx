'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FolderOpen, Eye, EyeOff, Activity, ChevronDown, Terminal, Pencil, MessageSquare, AlertCircle, Brain } from 'lucide-react';
import type { WatchedProject, CodeEvent } from '@/types/code-monitor';
import { authFetch } from '@/lib/dashboard-auth-client';

interface LocalProjectsProps {
  watchedFolder: string;
  watcherRunning: boolean;
  projects: WatchedProject[];
  events: CodeEvent[];
}

function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const eventIcon: Record<string, typeof Terminal> = {
  tool_use: Terminal,
  file_edit: Pencil,
  message: MessageSquare,
  error: AlertCircle,
  thinking: Brain,
};

const eventColor: Record<string, string> = {
  tool_use: 'border-l-blue-500',
  file_edit: 'border-l-emerald-500',
  message: 'border-l-slate-400',
  error: 'border-l-red-500',
  thinking: 'border-l-purple-500',
  session_start: 'border-l-emerald-500',
  session_end: 'border-l-slate-400',
};

const MAX_PROJECT_EVENTS = 8;

function ProjectCard({
  project,
  events,
}: {
  project: WatchedProject;
  events: CodeEvent[];
}) {
  const [expanded, setExpanded] = useState(false);

  const projectEvents = useMemo(() => {
    return events
      .filter((e) => e.projectDir === project.encodedDir && e.type !== 'session_start' && e.type !== 'session_end')
      .slice(-MAX_PROJECT_EVENTS);
  }, [events, project.encodedDir]);

  const hasEvents = projectEvents.length > 0;

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <button
        type="button"
        className="flex items-center gap-3 p-2.5 w-full text-left hover:bg-accent/50 transition-colors"
        onClick={() => hasEvents && setExpanded((v) => !v)}
      >
        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{project.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{project.path}</p>
        </div>
        <div className="text-right shrink-0 flex items-center gap-2">
          <div>
            <Badge
              variant={project.activeSessions > 0 ? 'default' : 'secondary'}
              className="text-[10px] px-1.5 py-0"
            >
              {project.activeSessions > 0
                ? `${project.activeSessions} active`
                : 'idle'}
            </Badge>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatRelativeTime(project.lastActivity)}
            </p>
          </div>
          {hasEvents && (
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          )}
        </div>
      </button>

      {expanded && projectEvents.length > 0 && (
        <div className="border-t bg-muted/30 px-2.5 py-2 space-y-1">
          {projectEvents.map((event) => {
            const Icon = eventIcon[event.type] || Activity;
            return (
              <div
                key={event.id}
                className={`flex items-start gap-2 border-l-2 pl-2 py-0.5 ${eventColor[event.type] || 'border-l-slate-300'}`}
              >
                <Icon className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                <p className="text-[11px] text-foreground leading-tight flex-1 min-w-0 break-words">
                  {event.message}
                </p>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatTime(event.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LocalProjects({ watchedFolder, watcherRunning, projects, events }: LocalProjectsProps) {
  const toggleWatcher = useCallback(async () => {
    try {
      await authFetch('/api/code-monitor/watcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: watcherRunning ? 'stop' : 'start' }),
      });
    } catch (err) {
      console.error('Failed to toggle watcher:', err);
    }
  }, [watcherRunning]);

  const activeCount = projects.filter((p) => p.activeSessions > 0).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Local Projects</CardTitle>
            {watcherRunning && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {activeCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {watcherRunning ? <Eye className="h-3.5 w-3.5 inline" /> : <EyeOff className="h-3.5 w-3.5 inline" />}
            </span>
            <Switch
              checked={watcherRunning}
              onCheckedChange={toggleWatcher}
              aria-label="Toggle file watcher"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Watching <code className="bg-muted px-1 rounded text-[11px]">{watchedFolder}</code>
        </p>
      </CardHeader>

      <CardContent>
        {!watcherRunning ? (
          <div className="text-center py-4 text-muted-foreground">
            <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">File watcher is paused</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={toggleWatcher}>
              Start Watching
            </Button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No projects detected yet</p>
            <p className="text-xs mt-1">
              Start a Claude Code session in a subfolder of {watchedFolder}
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard
                key={project.encodedDir}
                project={project}
                events={events}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
