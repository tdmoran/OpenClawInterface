'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCodeMonitorStore } from '@/stores/code-monitor-store';
import {
  mockMachines,
  mockCodeSessions,
  mockCodeEvents,
  mockCodeCommands,
  mockWatchedProjects,
} from '@/lib/mock-code-monitor-data';

export function useCodeMonitor() {
  const store = useCodeMonitorStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMachines = useCallback(async () => {
    try {
      const res = await fetch('/api/code-monitor/machines');
      if (res.ok) {
        const data = await res.json();
        store.setMachines(data.machines);
      }
    } catch {
      // Ignore - SSE will handle reconnection
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connectSSE = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/code-monitor/events');
    eventSourceRef.current = es;

    es.onopen = () => {
      store.setConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'snapshot':
            store.setMachines(msg.data.machines || []);
            store.addEvents(msg.data.events || []);
            store.setCommands(msg.data.commands || []);
            if (msg.data.watcherStatus) {
              store.setWatcherStatus(msg.data.watcherStatus);
            }
            break;
          case 'event':
            store.addEvent(msg.data);
            break;
          case 'machine_registered':
          case 'machine_removed':
          case 'machine_status':
            // Refresh machines list
            fetchMachines();
            break;
          case 'command_created':
            store.addCommand(msg.data);
            break;
          case 'command_updated':
            store.updateCommand(msg.data.id, msg.data);
            break;
          case 'watcher_status':
            store.setWatcherStatus(msg.data);
            break;
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    es.onerror = () => {
      store.setConnected(false);
      // Load mock data as fallback
      store.setMachines(mockMachines);
      store.setActiveSessions(mockCodeSessions);
      store.addEvents(mockCodeEvents);
      store.setCommands(mockCodeCommands);
      store.setWatcherStatus({
        running: true,
        watchedFolder: '~/Desktop',
        projects: mockWatchedProjects,
      });

      // Try reconnect after 5s
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          connectSSE();
        }
      }, 5000);
    };
  }, [fetchMachines]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connectSSE();

    // Poll machines every 5s for status updates
    pollIntervalRef.current = setInterval(fetchMachines, 5000);

    return () => {
      eventSourceRef.current?.close();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [connectSSE, fetchMachines]);

  const machines = useCodeMonitorStore((s) => s.machines);
  const events = useCodeMonitorStore((s) => s.events);
  const commands = useCodeMonitorStore((s) => s.commands);
  const activeSessions = useCodeMonitorStore((s) => s.activeSessions);
  const selectedMachineId = useCodeMonitorStore((s) => s.selectedMachineId);
  const isConnected = useCodeMonitorStore((s) => s.isConnected);
  const watchedProjects = useCodeMonitorStore((s) => s.watchedProjects);
  const watcherRunning = useCodeMonitorStore((s) => s.watcherRunning);
  const watchedFolder = useCodeMonitorStore((s) => s.watchedFolder);

  return {
    machines,
    events,
    commands,
    activeSessions,
    selectedMachineId,
    isConnected,
    watchedProjects,
    watcherRunning,
    watchedFolder,
    onlineMachines: machines.filter((m) => m.status !== 'offline'),
    offlineMachines: machines.filter((m) => m.status === 'offline'),
  };
}
