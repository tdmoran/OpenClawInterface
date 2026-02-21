'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FolderOpen, Eye, EyeOff, Activity } from 'lucide-react';
import type { WatchedProject } from '@/types/code-monitor';

interface LocalProjectsProps {
  watchedFolder: string;
  watcherRunning: boolean;
  projects: WatchedProject[];
}

function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function LocalProjects({ watchedFolder, watcherRunning, projects }: LocalProjectsProps) {
  const toggleWatcher = useCallback(async () => {
    try {
      await fetch('/api/code-monitor/watcher', {
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
              <div
                key={project.encodedDir}
                className="flex items-center gap-3 p-2.5 rounded-md border bg-card hover:bg-accent/50 transition-colors"
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{project.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{project.path}</p>
                </div>
                <div className="text-right shrink-0">
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
