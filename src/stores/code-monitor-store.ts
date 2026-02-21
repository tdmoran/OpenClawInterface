'use client';

import { create } from 'zustand';
import type { Machine, CodeEvent, CodeCommand, CodeSession } from '@/types/code-monitor';

interface CodeMonitorState {
  machines: Machine[];
  events: CodeEvent[];
  commands: CodeCommand[];
  activeSessions: CodeSession[];
  selectedMachineId: string | null;
  isConnected: boolean;

  setMachines: (machines: Machine[]) => void;
  addEvent: (event: CodeEvent) => void;
  addEvents: (events: CodeEvent[]) => void;
  setCommands: (commands: CodeCommand[]) => void;
  addCommand: (command: CodeCommand) => void;
  updateCommand: (commandId: string, update: Partial<CodeCommand>) => void;
  setActiveSessions: (sessions: CodeSession[]) => void;
  selectMachine: (machineId: string | null) => void;
  setConnected: (connected: boolean) => void;
  clearEvents: () => void;
}

export const useCodeMonitorStore = create<CodeMonitorState>()((set) => ({
  machines: [],
  events: [],
  commands: [],
  activeSessions: [],
  selectedMachineId: null,
  isConnected: false,

  setMachines: (machines) => set({ machines }),
  addEvent: (event) =>
    set((state) => ({
      events: [...state.events, event].slice(-1000),
    })),
  addEvents: (events) =>
    set((state) => ({
      events: [...state.events, ...events].slice(-1000),
    })),
  setCommands: (commands) => set({ commands }),
  addCommand: (command) =>
    set((state) => ({
      commands: [command, ...state.commands],
    })),
  updateCommand: (commandId, update) =>
    set((state) => ({
      commands: state.commands.map((c) =>
        c.id === commandId ? { ...c, ...update } : c
      ),
    })),
  setActiveSessions: (sessions) => set({ activeSessions: sessions }),
  selectMachine: (machineId) => set({ selectedMachineId: machineId }),
  setConnected: (connected) => set({ isConnected: connected }),
  clearEvents: () => set({ events: [] }),
}));
