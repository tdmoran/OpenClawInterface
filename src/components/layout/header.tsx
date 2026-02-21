'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import { ConnectionStatus } from './connection-status';
import { Separator } from '@/components/ui/separator';

const pageTitles: Record<string, string> = {
  '/dashboard': 'The Bar',
  '/flow': 'Bar Map',
  '/monitor': 'Live Feed',
  '/agents': 'The Regulars',
  '/sessions': 'Open Tabs',
  '/memory': 'Memories',
  '/settings': 'Back Office',
};

export function Header() {
  const pathname = usePathname();

  const title = Object.entries(pageTitles).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] || 'The Bar';

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <ConnectionStatus />
        <Separator orientation="vertical" className="h-6" />
        <ThemeToggle />
      </div>
    </header>
  );
}
