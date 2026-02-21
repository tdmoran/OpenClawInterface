'use client';

import { useMemo } from 'react';
import { useEventsStore } from '@/stores/events-store';
import type { LogEntry } from '@/types/events';

export function useLogStream() {
  const entries = useEventsStore((s) => s.entries);
  const filters = useEventsStore((s) => s.filters);
  const setFilters = useEventsStore((s) => s.setFilters);
  const clear = useEventsStore((s) => s.clear);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry: LogEntry) => {
      if (filters.severity.length > 0 && !filters.severity.includes(entry.severity)) {
        return false;
      }
      if (filters.types.length > 0 && !filters.types.includes(entry.type)) {
        return false;
      }
      if (filters.sessionId && entry.sessionId !== filters.sessionId) {
        return false;
      }
      if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        return (
          entry.message.toLowerCase().includes(search) ||
          entry.type.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [entries, filters]);

  return {
    entries: filteredEntries,
    allEntries: entries,
    filters,
    setFilters,
    clear,
    count: entries.length,
    filteredCount: filteredEntries.length,
  };
}
