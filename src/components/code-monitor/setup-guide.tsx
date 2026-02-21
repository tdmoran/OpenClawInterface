'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

const steps = [
  {
    title: '0. Automatic local watching',
    description:
      'Projects under ~/Desktop/ClaudeCode/ are watched automatically. Start a Claude Code session in any subfolder and it will appear here in seconds.',
  },
  {
    title: '1. Navigate to the project (remote agents)',
    code: 'cd your-project && cd tools/claude-monitor-agent',
  },
  {
    title: '2. Start the agent',
    code: 'npx tsx index.ts --dashboard http://localhost:3000',
  },
  {
    title: '3. What happens',
    description:
      'The agent registers with this dashboard, configures Claude Code hooks, and begins forwarding events.',
  },
];

export function SetupGuide() {
  const [isOpen, setIsOpen] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setIsOpen(!isOpen)}
        >
          <CardTitle className="text-sm font-medium">Get Started</CardTitle>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="space-y-2">
              <p className="text-sm font-medium">{step.title}</p>
              {step.code ? (
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto">
                    {step.code}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1.5 right-1.5 h-6 w-6"
                    onClick={() => handleCopy(step.code, index)}
                  >
                    {copiedIndex === index ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{step.description}</p>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
