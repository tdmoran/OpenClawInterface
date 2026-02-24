'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, Calendar, RefreshCw } from 'lucide-react';
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
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const fetchFiles = () => {
    setLoading(true);
    fetch(`${getCodeMonitorBaseUrl()}/api/markdown-files`)
      .then((r) => r.json())
      .then((data) => {
        setFiles(data.files || []);
        if (!selectedFile && data.files?.length > 0) {
          setSelectedFile(data.files[0].name);
        }
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
  const active = files.find((f) => f.name === selectedFile);

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

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-12rem)]">
      {/* File sidebar */}
      <div className="w-full md:w-56 shrink-0 md:space-y-3">
        <div className="flex items-center justify-between mb-2 md:mb-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Files</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchFiles}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {workspaceFiles.length > 0 && (
            <>
              <p className="hidden md:block text-xs uppercase tracking-wider text-muted-foreground font-medium px-2">Workspace</p>
              {workspaceFiles.map((file) => (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file.name)}
                  className={`whitespace-nowrap flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    selectedFile === file.name
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
            </>
          )}

          {memoryFiles.length > 0 && (
            <>
              <p className="hidden md:block text-xs uppercase tracking-wider text-muted-foreground font-medium px-2 mt-3">Daily Logs</p>
              {memoryFiles.map((file) => (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file.name)}
                  className={`whitespace-nowrap flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    selectedFile === file.name
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{file.name.replace('.md', '')}</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="hidden md:block pt-2 border-t">
          <p className="text-xs text-muted-foreground px-2">
            {files.length} files from ~/.openclaw/workspace/
          </p>
        </div>
      </div>

      {/* Content panel */}
      <Card className="h-64 md:h-auto md:flex-1 flex flex-col min-w-0">
        <CardHeader className="pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{active?.name || 'Select a file'}</CardTitle>
              {active && (
                <Badge variant="outline" className="text-xs">
                  {active.category}
                </Badge>
              )}
            </div>
            {active && (
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
                {active.path}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          {active ? (
            <ScrollArea className="h-full pr-4">
              <MarkdownRenderer content={active.content} />
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Select a file from the sidebar
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
