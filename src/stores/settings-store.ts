import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  logBufferSize: number;
  autoReconnect: boolean;
  notificationsEnabled: boolean;
  sidebarCollapsed: boolean;
  chatOpen: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLogBufferSize: (size: number) => void;
  setAutoReconnect: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setChatOpen: (open: boolean) => void;
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
      setTheme: (theme) => set({ theme }),
      setLogBufferSize: (logBufferSize) => set({ logBufferSize }),
      setAutoReconnect: (autoReconnect) => set({ autoReconnect }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setChatOpen: (chatOpen) => set({ chatOpen }),
    }),
    {
      name: 'openclaw-settings',
    }
  )
);
