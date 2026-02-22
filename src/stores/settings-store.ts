import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_DASHBOARD_WIDGETS: Record<string, boolean> = {
  healthCards: true,
  statsCards: true,
  tokenChart: true,
  activityFeed: true,
  costBreakdown: true,
};

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  logBufferSize: number;
  autoReconnect: boolean;
  notificationsEnabled: boolean;
  sidebarCollapsed: boolean;
  chatOpen: boolean;
  mobileMenuOpen: boolean;
  dashboardWidgets: Record<string, boolean>;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLogBufferSize: (size: number) => void;
  setAutoReconnect: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleWidget: (key: string) => void;
  setWidgetVisibility: (key: string, visible: boolean) => void;
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
      dashboardWidgets: { ...DEFAULT_DASHBOARD_WIDGETS },
      setTheme: (theme) => set({ theme }),
      setLogBufferSize: (logBufferSize) => set({ logBufferSize }),
      setAutoReconnect: (autoReconnect) => set({ autoReconnect }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setChatOpen: (chatOpen) => set({ chatOpen }),
      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
      toggleWidget: (key) =>
        set((state) => ({
          dashboardWidgets: {
            ...state.dashboardWidgets,
            [key]: !state.dashboardWidgets[key],
          },
        })),
      setWidgetVisibility: (key, visible) =>
        set((state) => ({
          dashboardWidgets: {
            ...state.dashboardWidgets,
            [key]: visible,
          },
        })),
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
        dashboardWidgets: state.dashboardWidgets,
      }),
    }
  )
);
