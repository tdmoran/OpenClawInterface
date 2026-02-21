import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  logBufferSize: number;
  autoReconnect: boolean;
  notificationsEnabled: boolean;
  sidebarCollapsed: boolean;
  chatOpen: boolean;
  mobileMenuOpen: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLogBufferSize: (size: number) => void;
  setAutoReconnect: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  requestNotificationPermission: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      logBufferSize: 10000,
      autoReconnect: true,
      notificationsEnabled: true,
      sidebarCollapsed: false,
      chatOpen: false,
      mobileMenuOpen: false,
      setTheme: (theme) => set({ theme }),
      setLogBufferSize: (logBufferSize) => set({ logBufferSize }),
      setAutoReconnect: (autoReconnect) => set({ autoReconnect }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setChatOpen: (chatOpen) => set({ chatOpen }),
      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
      requestNotificationPermission: async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
          set({ notificationsEnabled: false });
          return;
        }
        try {
          const permission = await Notification.requestPermission();
          set({ notificationsEnabled: permission === 'granted' });
        } catch {
          set({ notificationsEnabled: false });
        }
      },
    }),
    {
      name: 'openclaw-settings',
      partialize: (state) => ({
        theme: state.theme,
        logBufferSize: state.logBufferSize,
        autoReconnect: state.autoReconnect,
        notificationsEnabled: state.notificationsEnabled,
        sidebarCollapsed: state.sidebarCollapsed,
        chatOpen: state.chatOpen,
      }),
    }
  )
);
