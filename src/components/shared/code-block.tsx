'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language, className, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative rounded-lg border bg-muted/50', className)}>
      {language && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">{language}</span>
          <Button variant="ghost" size="icon" className="h-9 w-9 md:h-8 md:w-8" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
      {!language && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-9 w-9 md:h-8 md:w-8"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-sm">
        {showLineNumbers ? (
          lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="mr-4 inline-block w-8 text-right text-muted-foreground select-none">{i + 1}</span>
              <span>{line}</span>
            </div>
          ))
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  );
}
