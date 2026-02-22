import { describe, it, expect, beforeEach } from 'vitest';
import { useEventsStore } from '../events-store';
import type { LogEntry } from '@/types/events';

function makeEntry(id: string, overrides?: Partial<LogEntry>): LogEntry {
  return {
    id,
    timestamp: Date.now(),
    type: 'session.started',
    severity: 'info',
    message: `Event ${id}`,
    ...overrides,
  };
}

describe('events-store', () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    useEventsStore.setState({
      entries: [],
      filters: {
        severity: [],
        types: [],
        sessionId: null,
        searchText: '',
      },
    });
  });

  describe('addEntry', () => {
    it('adds a single entry to an empty store', () => {
      const entry = makeEntry('e1');
      useEventsStore.getState().addEntry(entry);
      expect(useEventsStore.getState().entries).toHaveLength(1);
      expect(useEventsStore.getState().entries[0].id).toBe('e1');
    });

    it('adds multiple entries sequentially', () => {
      useEventsStore.getState().addEntry(makeEntry('e1'));
      useEventsStore.getState().addEntry(makeEntry('e2'));
      useEventsStore.getState().addEntry(makeEntry('e3'));
      expect(useEventsStore.getState().entries).toHaveLength(3);
    });

    it('respects the MAX_ENTRIES (10000) ring buffer limit', () => {
      // Pre-fill the store with 10000 entries
      const entries = Array.from({ length: 10000 }, (_, i) => makeEntry(`e${i}`));
      useEventsStore.setState({ entries });
      expect(useEventsStore.getState().entries).toHaveLength(10000);

      // Adding one more should keep it at 10000
      useEventsStore.getState().addEntry(makeEntry('overflow'));
      const state = useEventsStore.getState().entries;
      expect(state).toHaveLength(10000);

      // The oldest entry should have been dropped; the newest should be last
      expect(state[state.length - 1].id).toBe('overflow');
      expect(state[0].id).toBe('e1'); // e0 was evicted
    });
  });

  describe('addEntries', () => {
    it('adds multiple entries at once', () => {
      const entries = [makeEntry('e1'), makeEntry('e2'), makeEntry('e3')];
      useEventsStore.getState().addEntries(entries);
      expect(useEventsStore.getState().entries).toHaveLength(3);
    });

    it('trims to MAX_ENTRIES when batch causes overflow', () => {
      const initial = Array.from({ length: 9999 }, (_, i) => makeEntry(`e${i}`));
      useEventsStore.setState({ entries: initial });

      const newEntries = [makeEntry('new1'), makeEntry('new2')];
      useEventsStore.getState().addEntries(newEntries);

      const state = useEventsStore.getState().entries;
      expect(state).toHaveLength(10000);
      // The last two entries should be the new ones
      expect(state[state.length - 1].id).toBe('new2');
      expect(state[state.length - 2].id).toBe('new1');
    });

    it('handles adding an empty array', () => {
      useEventsStore.getState().addEntry(makeEntry('e1'));
      useEventsStore.getState().addEntries([]);
      expect(useEventsStore.getState().entries).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      useEventsStore.getState().addEntry(makeEntry('e1'));
      useEventsStore.getState().addEntry(makeEntry('e2'));
      expect(useEventsStore.getState().entries).toHaveLength(2);

      useEventsStore.getState().clear();
      expect(useEventsStore.getState().entries).toHaveLength(0);
    });
  });

  describe('setFilters', () => {
    it('updates severity filter', () => {
      useEventsStore.getState().setFilters({ severity: ['error', 'warning'] });
      expect(useEventsStore.getState().filters.severity).toEqual(['error', 'warning']);
    });

    it('updates search text without affecting other filters', () => {
      useEventsStore.getState().setFilters({ severity: ['info'] });
      useEventsStore.getState().setFilters({ searchText: 'test query' });
      const filters = useEventsStore.getState().filters;
      expect(filters.searchText).toBe('test query');
      expect(filters.severity).toEqual(['info']);
    });

    it('updates sessionId filter', () => {
      useEventsStore.getState().setFilters({ sessionId: 'session-123' });
      expect(useEventsStore.getState().filters.sessionId).toBe('session-123');
    });

    it('updates types filter', () => {
      useEventsStore.getState().setFilters({ types: ['session.started', 'session.ended'] });
      expect(useEventsStore.getState().filters.types).toEqual(['session.started', 'session.ended']);
    });
  });
});
