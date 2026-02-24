'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCodeMonitorBaseUrl } from '@/lib/code-monitor/url';

interface MdFile {
  name: string;
  path: string;
  content: string;
  category: 'workspace' | 'memory';
}

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 border-b pb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
          p: ({ children }) => <p className="text-sm leading-relaxed mb-2">{children}</p>,
          ul: ({ children }) => <ul className="text-sm list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="text-sm list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-sm">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <code className="block bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto mb-2">
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="mb-2">{children}</pre>,
          hr: () => <hr className="my-3 border-border" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground text-sm mb-2">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function MemoryViewer() {
  const [files, setFiles] = useState<MdFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const toggleFile = (name: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const fetchFiles = () => {
    setLoading(true);
    fetch(`${getCodeMonitorBaseUrl()}/api/markdown-files`)
      .then((r) => r.json())
      .then((data) => {
        setFiles(data.files || []);
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const workspaceFiles = files.filter((f) => f.category === 'workspace');
  const memoryFiles = files.filter((f) => f.category === 'memory');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No .md files found in ~/.openclaw/workspace/</p>
      </div>
    );
  }

  const renderFileGrid = (categoryFiles: MdFile[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categoryFiles.map((file) => {
        const expanded = expandedFiles.has(file.name);
        return (
          <Card
            key={file.name}
            className={expanded ? 'md:col-span-2 lg:col-span-3' : ''}
          >
            <CardHeader
              className="cursor-pointer pb-3"
              onClick={() => toggleFile(file.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <CardTitle className="text-sm truncate">{file.name}</CardTitle>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {file.category}
                  </Badge>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    expanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </CardHeader>
            {expanded && (
              <CardContent>
                <p className="text-xs text-muted-foreground font-mono mb-3">{file.path}</p>
                <MarkdownRenderer content={file.content} />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Files</span>
          <Badge variant="secondary" className="text-xs">{files.length}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchFiles}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Tabs defaultValue="workspace">
        <TabsList>
          <TabsTrigger value="workspace">
            Workspace ({workspaceFiles.length})
          </TabsTrigger>
          <TabsTrigger value="logs">
            Daily Logs ({memoryFiles.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="workspace" className="mt-4">
          {workspaceFiles.length > 0 ? (
            renderFileGrid(workspaceFiles)
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No workspace files found</p>
          )}
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          {memoryFiles.length > 0 ? (
            renderFileGrid(memoryFiles)
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No daily log files found</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
