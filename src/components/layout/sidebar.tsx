'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitBranch,
  Activity,
  Bot,
  MessageSquare,
  Brain,
  Settings,
  ChevronLeft,
  ChevronRight,
  Beer,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettingsStore } from '@/stores/settings-store';

const navItems = [
  { href: '/dashboard', label: 'The Bar', icon: LayoutDashboard },
  { href: '/flow', label: 'Bar Map', icon: GitBranch },
  { href: '/monitor', label: 'Live Feed', icon: Activity },
  { href: '/agents', label: 'Regulars', icon: Bot },
  { href: '/sessions', label: 'Tabs', icon: MessageSquare },
  { href: '/memory', label: 'Memories', icon: Brain },
  { href: '/settings', label: 'Back Office', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);
  const chatOpen = useSettingsStore((s) => s.chatOpen);
  const setChatOpen = useSettingsStore((s) => s.setChatOpen);

  const chatButton = (
    <Button
      variant={chatOpen ? 'secondary' : 'ghost'}
      size="sm"
      className={cn('w-full', collapsed ? 'justify-center px-2' : 'justify-start')}
      onClick={() => setChatOpen(!chatOpen)}
    >
      <MessageCircle className="h-4 w-4" />
      {!collapsed && <span className="ml-2 text-xs">Holler</span>}
    </Button>
  );

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-14 items-center border-b px-4', collapsed && 'justify-center px-2')}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Beer className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wide">NORM!</span>
              <span className="text-[10px] text-muted-foreground leading-none italic">Where everybody knows your agents</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          const linkContent = (
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      {/* Chat + Collapse */}
      <div className="border-t p-2 space-y-1">
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{chatButton}</TooltipTrigger>
            <TooltipContent side="right">Holler</TooltipContent>
          </Tooltip>
        ) : (
          chatButton
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full', collapsed ? 'justify-center px-2' : 'justify-start')}
          onClick={() => setSidebarCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
