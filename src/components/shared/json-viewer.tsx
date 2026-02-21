'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface JsonViewerProps {
  data: unknown;
  className?: string;
  defaultExpanded?: boolean;
}

export function JsonViewer({ data, className, defaultExpanded = true }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative rounded-lg border bg-muted/50 p-4 font-mono text-sm', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      <JsonNode data={data} depth={0} defaultExpanded={defaultExpanded} />
    </div>
  );
}

function JsonNode({ data, depth, defaultExpanded }: { data: unknown; depth: number; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded && depth < 3);

  if (data === null) return <span className="text-muted-foreground">null</span>;
  if (data === undefined) return <span className="text-muted-foreground">undefined</span>;
  if (typeof data === 'boolean') return <span className="text-orange-600 dark:text-orange-400">{String(data)}</span>;
  if (typeof data === 'number') return <span className="text-blue-600 dark:text-blue-400">{data}</span>;
  if (typeof data === 'string') return <span className="text-emerald-600 dark:text-emerald-400">&quot;{data}&quot;</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground">[]</span>;
    return (
      <span>
        <button onClick={() => setExpanded(!expanded)} className="inline-flex items-center hover:text-foreground text-muted-foreground">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="ml-1">Array({data.length})</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-border pl-3">
            {data.map((item, i) => (
              <div key={i} className="py-0.5">
                <span className="text-muted-foreground mr-2">{i}:</span>
                <JsonNode data={item} depth={depth + 1} defaultExpanded={defaultExpanded} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-muted-foreground">{'{}'}</span>;
    return (
      <span>
        <button onClick={() => setExpanded(!expanded)} className="inline-flex items-center hover:text-foreground text-muted-foreground">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="ml-1">{'{'}...{'}'}</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-border pl-3">
            {entries.map(([key, value]) => (
              <div key={key} className="py-0.5">
                <span className="text-purple-600 dark:text-purple-400">{key}</span>
                <span className="text-muted-foreground">: </span>
                <JsonNode data={value} depth={depth + 1} defaultExpanded={defaultExpanded} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  return <span>{String(data)}</span>;
}
