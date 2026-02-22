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
  Timer,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cat,
  MessageCircle,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettingsStore } from '@/stores/settings-store';
import { useMediaQuery } from '@/hooks/use-media-query';

const navItems = [
  { href: '/dashboard', label: 'Homebase', icon: LayoutDashboard },
  { href: '/flow', label: 'Agent Flow', icon: GitBranch },
  { href: '/monitor', label: 'Monitor', icon: Activity },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/sessions', label: 'Sessions', icon: MessageSquare },
  { href: '/code-monitor', label: 'Code Monitor', icon: Monitor },
  { href: '/memory', label: 'Memory', icon: Brain },
  { href: '/cron', label: 'Cron Jobs', icon: Timer },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);
  const chatOpen = useSettingsStore((s) => s.chatOpen);
  const setChatOpen = useSettingsStore((s) => s.setChatOpen);
  const mobileMenuOpen = useSettingsStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useSettingsStore((s) => s.setMobileMenuOpen);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleNavClick = () => {
    if (!isDesktop) {
      setMobileMenuOpen(false);
    }
  };

  const chatButton = (
    <Button
      variant={chatOpen ? 'secondary' : 'ghost'}
      size="sm"
      className={cn(
        'w-full',
        isDesktop && collapsed ? 'justify-center px-2' : 'justify-start'
      )}
      onClick={() => {
        setChatOpen(!chatOpen);
        if (!isDesktop) setMobileMenuOpen(false);
      }}
      aria-label={chatOpen ? 'Close chat' : 'Open chat'}
    >
      <MessageCircle className="h-4 w-4" />
      {(isDesktop ? !collapsed : true) && <span className="ml-2 text-xs">Chat</span>}
    </Button>
  );

  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 items-center border-b px-4',
          isDesktop && collapsed && 'justify-center px-2'
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2" onClick={handleNavClick}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cat className="h-4 w-4" />
          </div>
          {(isDesktop ? !collapsed : true) && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Clawkins</span>
              <span className="text-[10px] text-muted-foreground leading-none">Homebase</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          const linkContent = (
            <Link
              href={item.href}
              onClick={handleNavClick}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                isDesktop && collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {(isDesktop ? !collapsed : true) ? (
                <span>{item.label}</span>
              ) : (
                <span className="sr-only">{item.label}</span>
              )}
            </Link>
          );

          if (isDesktop && collapsed) {
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

      {/* Chat + Collapse (desktop only shows collapse) */}
      <div className="border-t p-2 space-y-1">
        {isDesktop && collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{chatButton}</TooltipTrigger>
            <TooltipContent side="right">Chat</TooltipContent>
          </Tooltip>
        ) : (
          chatButton
        )}
        {isDesktop && (
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full', collapsed ? 'justify-center px-2' : 'justify-start')}
            onClick={() => setSidebarCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
          </Button>
        )}
      </div>
    </>
  );

  // Mobile: slide-in drawer overlay
  if (!isDesktop) {
    return (
      <>
        {/* Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        {/* Drawer */}
        <aside
          aria-label="Main navigation"
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-60 flex flex-col border-r bg-card',
            'transform transition-transform duration-300',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: collapsible sidebar
  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        'flex h-screen flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
