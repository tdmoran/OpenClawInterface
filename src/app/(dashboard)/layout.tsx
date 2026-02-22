'use client';

import { WifiOff } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ChatPanel } from '@/components/layout/chat-panel';
import { useSettingsStore } from '@/stores/settings-store';
import { useConnectionStore } from '@/stores/connection-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const chatOpen = useSettingsStore((s) => s.chatOpen);
  const connectionStatus = useConnectionStore((s) => s.status);
  const isDisconnected = connectionStatus !== 'connected' && connectionStatus !== 'connecting';

  return (
    <div className="flex h-screen overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>
      <Sidebar />
      {chatOpen && <ChatPanel />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {isDisconnected && (
          <div className="flex items-center gap-2 border-b bg-amber-500/10 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-400">
            <WifiOff className="h-3 w-3 shrink-0" />
            <span>Not connected to gateway — data shown may be stale. Check Settings to configure your gateway URL.</span>
          </div>
        )}
        <main id="main-content" className="flex-1 overflow-auto bg-background p-3 md:p-6 safe-area-padding">
          {children}
        </main>
      </div>
    </div>
  );
}
