'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { ConnectionStatus } from './connection-status';
import { CommandPalette } from './command-palette';
import { GatewaySelector } from './gateway-selector';
import { AlertNotificationIndicator } from '@/components/alerts/alert-notification-indicator';
import { useSettingsStore } from '@/stores/settings-store';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Homebase',
  '/flow': 'Agent Flow',
  '/monitor': 'Live Monitor',
  '/agents': 'Agents',
  '/sessions': 'Sessions',
  '/code-monitor': 'Code Monitor',
  '/memory': 'Memory',
  '/settings': 'Settings',
  '/cron': 'Cron Jobs',
  '/alerts': 'Alerts',
};

export function Header() {
  const pathname = usePathname();
  const setMobileMenuOpen = useSettingsStore((s) => s.setMobileMenuOpen);

  const title = Object.entries(pageTitles).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] || 'Homebase';

  return (
    <header className="flex h-[60px] items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-10 w-10"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-1.5">
        <CommandPalette />
        <div className="hidden sm:flex items-center gap-1.5">
          <GatewaySelector />
          <ConnectionStatus />
        </div>
        <AlertNotificationIndicator />
        <ThemeToggle />
      </div>
    </header>
  );
}
