'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';
import { GatewayProvider } from './gateway-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <GatewayProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </GatewayProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
