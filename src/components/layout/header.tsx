'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import { ConnectionStatus } from './connection-status';
import { Separator } from '@/components/ui/separator';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/flow': 'Agent Flow',
  '/monitor': 'Live Monitor',
  '/agents': 'Agents',
  '/sessions': 'Sessions',
  '/memory': 'Memory',
  '/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();

  const title = Object.entries(pageTitles).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] || 'Dashboard';

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
