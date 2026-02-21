'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodeBlock } from '@/components/shared/code-block';
import { Search, Calendar, Brain, FileText } from 'lucide-react';

const mockMemoryContent = `# Agent Memory

## Key Decisions
- Using TypeScript for all projects
- Prefer functional components over class components
- Use Zustand for state management

## User Preferences
- Dark mode preferred
- Verbose logging enabled
- Auto-save every 5 minutes

## Project Context
- Working on OpenClaw Dashboard
- Next.js 14+ with App Router
- shadcn/ui component library

## Recent Learnings
- WebSocket reconnection needs exponential backoff
- Ring buffer optimal for log streams > 10k entries
- React Flow v12 requires @xyflow/react package
`;

const mockDailyLogs = [
  { date: '2026-02-21', entries: 12, summary: 'Dashboard layout, WebSocket client' },
  { date: '2026-02-20', entries: 8, summary: 'Agent config viewer, skills browser' },
  { date: '2026-02-19', entries: 15, summary: 'Session replay, trace timeline' },
  { date: '2026-02-18', entries: 6, summary: 'Memory search implementation' },
  { date: '2026-02-17', entries: 10, summary: 'React Flow canvas, custom nodes' },
];

const mockSearchResults = [
  { id: 1, content: 'WebSocket reconnection needs exponential backoff', source: 'MEMORY.md', score: 0.95 },
  { id: 2, content: 'Ring buffer optimal for log streams > 10k entries', source: 'MEMORY.md', score: 0.87 },
  { id: 3, content: 'Using Zustand for real-time state management', source: 'decisions.md', score: 0.82 },
];

export function MemoryViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'vector' | 'bm25' | 'hybrid'>('hybrid');

  return (
    <div className="space-y-6">
      <Tabs defaultValue="memory">
        <TabsList>
          <TabsTrigger value="memory" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            MEMORY.md
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Daily Logs
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            Semantic Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="memory" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">MEMORY.md</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={mockMemoryContent} language="markdown" showLineNumbers />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Daily Activity Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockDailyLogs.map((log) => (
                  <div key={log.date} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{log.date}</p>
                        <p className="text-xs text-muted-foreground">{log.summary}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{log.entries} entries</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search memory..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-1">
                  {(['vector', 'bm25', 'hybrid'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={searchMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSearchMode(mode)}
                      className="text-xs"
                    >
                      {mode.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {searchQuery && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Results ({mockSearchResults.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockSearchResults.map((result) => (
                    <div key={result.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">{result.source}</Badge>
                        <span className="text-xs text-muted-foreground">Score: {result.score.toFixed(2)}</span>
                      </div>
                      <p className="text-sm">{result.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
