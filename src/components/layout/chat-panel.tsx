'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Send, Trash2, Bot, User, Loader2, X, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore, type ChatMessage } from '@/stores/chat-store';
import { useConnectionStore } from '@/stores/connection-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useChatContext } from '@/hooks/use-chat-context';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Stream a chat completion from the /api/chat route and call onChunk for each token. */
async function streamChat(
  chatMessages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  dashboardContext?: string,
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: chatMessages, dashboardContext }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          full += token;
          onChunk(full);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return full;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const slashCommands = [
  { command: '/agents', description: 'List all agents' },
  { command: '/status', description: 'System status' },
  { command: '/sessions', description: 'Active sessions' },
  { command: '/tokens', description: 'Token usage today' },
  { command: '/help', description: 'Available commands' },
];

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        ul: ({ children }) => <ul className="mb-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        code: ({ children, className }) => {
          const isInline = !className;
          if (isInline) {
            return <code className="rounded bg-background/50 px-1 py-0.5 text-[11px] font-mono">{children}</code>;
          }
          return <code className={className}>{children}</code>;
        },
        pre: ({ children }) => <pre className="my-1.5 overflow-x-auto rounded bg-background/50 p-2 text-[11px]">{children}</pre>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
      </div>
      <div className={cn('flex max-w-[85%] flex-col gap-1', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground',
          )}
        >
          {isUser ? message.content : <MarkdownContent content={message.content} />}
        </div>
        <span className="text-[10px] text-muted-foreground">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
}

const MIN_WIDTH = 260;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const { messages, isStreaming, streamingContent, addMessage, setStreaming, setStreamingContent, clearMessages } = useChatStore();
  const connectionStatus = useConnectionStore((s) => s.status);
  const setChatOpen = useSettingsStore((s) => s.setChatOpen);
  const { getContext, isLive } = useChatContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isDragging = useRef(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Show/hide command palette based on input
  useEffect(() => {
    setShowCommands(input.startsWith('/') && !input.includes(' '));
  }, [input]);

  // Resize drag handling (desktop only)
  useEffect(() => {
    if (!isDesktop) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDesktop]);

  const startDrag = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async () => {
    let trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    // Map slash commands to natural language
    const cmdMap: Record<string, string> = {
      '/agents': 'What agents are running?',
      '/status': 'What is the system status?',
      '/sessions': 'Show active sessions',
      '/tokens': 'Token usage today',
      '/help': 'What can you help with?',
    };
    if (cmdMap[trimmed]) trimmed = cmdMap[trimmed];

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setInput('');
    setShowCommands(false);
    setStreaming(true);
    setStreamingContent('');

    // Build message history for the API (last 20 messages for context)
    const history = [...messages, userMsg].slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    // Build live dashboard context to inject into system prompt
    const dashboardContext = getContext();

    let finalContent = '';
    try {
      finalContent = await streamChat(
        history,
        (partial) => setStreamingContent(partial),
        controller.signal,
        dashboardContext,
      );
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        finalContent = streamingContent || 'Message cancelled.';
      } else {
        finalContent = `Error: ${(err as Error).message}`;
      }
    }

    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: finalContent,
      timestamp: Date.now(),
    };
    addMessage(assistantMsg);
    setStreamingContent('');
    setStreaming(false);
    abortRef.current = null;
  }, [input, isStreaming, messages, addMessage, setStreaming, setStreamingContent, streamingContent, getContext]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredCommands = slashCommands.filter((c) =>
    c.command.startsWith(input.toLowerCase())
  );

  // Mobile: fullscreen overlay
  // Desktop: side panel with drag resize
  const containerClassName = isDesktop
    ? 'flex h-full flex-col border-r bg-card relative'
    : 'fixed inset-0 z-50 flex flex-col bg-card';

  const containerStyle = isDesktop ? { width: panelWidth } : undefined;

  return (
    <div className={containerClassName} style={containerStyle}>
      {/* Drag handle (desktop only) */}
      {isDesktop && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 z-10"
          onMouseDown={startDrag}
        />
      )}

      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Clawkins Chat</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearMessages}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setChatOpen(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Connection indicator */}
      <div className="flex items-center justify-between border-b px-4 py-1.5">
        <span className={cn(
          'text-[10px] font-medium',
          connectionStatus === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
        )}>
          {connectionStatus === 'connected' ? 'Connected to Gateway · Kimi K2.5' : 'Kimi K2.5 via Moonshot'}
        </span>
        <span className={cn(
          'flex items-center gap-1 text-[10px] font-medium',
          isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
        )}>
          <Radio className="h-2.5 w-2.5" />
          {isLive ? 'Context: Live' : 'Context: Offline'}
        </span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="flex flex-col gap-4 p-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Ask Clawkins</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ask about agents, sessions, system status, or token usage.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['What agents are running?', 'Show system status', 'Token usage today'].map((q) => (
                  <button
                    key={q}
                    className="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isStreaming && (
            <div className="flex gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                <Bot className="h-3 w-3" />
              </div>
              <div className="rounded-lg bg-muted px-3 py-2 text-sm max-w-[85%]">
                {streamingContent ? (
                  <span>
                    <MarkdownContent content={streamingContent} />
                    <span className="inline-block w-1.5 h-4 bg-foreground/60 animate-pulse ml-0.5 align-text-bottom" />
                  </span>
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3 relative">
        {/* Command palette */}
        {showCommands && filteredCommands.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border bg-popover shadow-lg overflow-hidden">
            {filteredCommands.map((cmd) => (
              <button
                key={cmd.command}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setInput(cmd.command);
                  inputRef.current?.focus();
                }}
              >
                <span className="font-mono text-xs text-primary">{cmd.command}</span>
                <span className="text-xs text-muted-foreground">{cmd.description}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Clawkins... (type / for commands)"
            rows={1}
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isStreaming}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
