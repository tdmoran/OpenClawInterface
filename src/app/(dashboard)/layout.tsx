'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ChatPanel } from '@/components/layout/chat-panel';
import { useSettingsStore } from '@/stores/settings-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const chatOpen = useSettingsStore((s) => s.chatOpen);

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
        <main id="main-content" className="flex-1 overflow-auto bg-background p-3 md:p-6 safe-area-padding">
          {children}
        </main>
      </div>
    </div>
  );
}
