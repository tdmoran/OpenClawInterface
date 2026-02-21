import { create } from 'zustand';
import type { LogEntry } from '@/types/events';

const MAX_ENTRIES = 10000;

interface EventsState {
  entries: LogEntry[];
  filters: EventFilters;
  addEntry: (entry: LogEntry) => void;
  addEntries: (entries: LogEntry[]) => void;
  clear: () => void;
  setFilters: (filters: Partial<EventFilters>) => void;
}

export interface EventFilters {
  severity: string[];
  types: string[];
  sessionId: string | null;
  searchText: string;
}

export const useEventsStore = create<EventsState>((set) => ({
  entries: [],
  filters: {
    severity: [],
    types: [],
    sessionId: null,
    searchText: '',
  },
  addEntry: (entry) =>
    set((state) => ({
      entries: state.entries.length >= MAX_ENTRIES
        ? [...state.entries.slice(-MAX_ENTRIES + 1), entry]
        : [...state.entries, entry],
    })),
  addEntries: (entries) =>
    set((state) => {
      const combined = [...state.entries, ...entries];
      return {
        entries: combined.length > MAX_ENTRIES ? combined.slice(-MAX_ENTRIES) : combined,
      };
    }),
  clear: () => set({ entries: [] }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
}));
