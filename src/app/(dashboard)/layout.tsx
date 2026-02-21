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
      <Sidebar />
      {chatOpen && <ChatPanel />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
