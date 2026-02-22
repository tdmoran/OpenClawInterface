import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from '../connection-store';

describe('connection-store', () => {
  beforeEach(() => {
    useConnectionStore.setState({
      status: 'disconnected',
      config: {
        url: 'ws://localhost:18789',
        token: '781bbfd298ccd819f0eda7950edb6c4fb7798480b2108c8a',
        reconnectInterval: 3000,
        maxReconnectAttempts: 10,
      },
      lastConnectedAt: null,
      error: null,
    });
  });

  describe('initial state', () => {
    it('starts with disconnected status', () => {
      expect(useConnectionStore.getState().status).toBe('disconnected');
    });

    it('starts with default gateway config', () => {
      const config = useConnectionStore.getState().config;
      expect(config.url).toBe('ws://localhost:18789');
      expect(config.reconnectInterval).toBe(3000);
      expect(config.maxReconnectAttempts).toBe(10);
    });

    it('starts with no error', () => {
      expect(useConnectionStore.getState().error).toBeNull();
    });

    it('starts with no lastConnectedAt', () => {
      expect(useConnectionStore.getState().lastConnectedAt).toBeNull();
    });
  });

  describe('setStatus', () => {
    it('transitions to connecting', () => {
      useConnectionStore.getState().setStatus('connecting');
      expect(useConnectionStore.getState().status).toBe('connecting');
    });

    it('transitions to connected', () => {
      useConnectionStore.getState().setStatus('connected');
      expect(useConnectionStore.getState().status).toBe('connected');
    });

    it('transitions to reconnecting', () => {
      useConnectionStore.getState().setStatus('reconnecting');
      expect(useConnectionStore.getState().status).toBe('reconnecting');
    });

    it('transitions to disconnected', () => {
      useConnectionStore.getState().setStatus('connected');
      useConnectionStore.getState().setStatus('disconnected');
      expect(useConnectionStore.getState().status).toBe('disconnected');
    });

    it('sets error message when transitioning to error', () => {
      useConnectionStore.getState().setStatus('error');
      expect(useConnectionStore.getState().status).toBe('error');
      expect(useConnectionStore.getState().error).toBe('Connection failed');
    });

    it('clears error when transitioning away from error', () => {
      useConnectionStore.getState().setStatus('error');
      expect(useConnectionStore.getState().error).toBe('Connection failed');

      useConnectionStore.getState().setStatus('connecting');
      expect(useConnectionStore.getState().error).toBeNull();
    });
  });

  describe('setConfig', () => {
    it('updates the URL', () => {
      useConnectionStore.getState().setConfig({ url: 'ws://example.com:9999' });
      expect(useConnectionStore.getState().config.url).toBe('ws://example.com:9999');
    });

    it('updates the token', () => {
      useConnectionStore.getState().setConfig({ token: 'new-token' });
      expect(useConnectionStore.getState().config.token).toBe('new-token');
    });

    it('partially updates config, preserving existing values', () => {
      useConnectionStore.getState().setConfig({ reconnectInterval: 5000 });
      const config = useConnectionStore.getState().config;
      expect(config.reconnectInterval).toBe(5000);
      expect(config.url).toBe('ws://localhost:18789');
      expect(config.maxReconnectAttempts).toBe(10);
    });

    it('updates multiple config fields at once', () => {
      useConnectionStore.getState().setConfig({ url: 'ws://new:8080', maxReconnectAttempts: 5 });
      const config = useConnectionStore.getState().config;
      expect(config.url).toBe('ws://new:8080');
      expect(config.maxReconnectAttempts).toBe(5);
    });
  });

  describe('setError', () => {
    it('sets a custom error message', () => {
      useConnectionStore.getState().setError('Custom error');
      expect(useConnectionStore.getState().error).toBe('Custom error');
    });

    it('clears the error with null', () => {
      useConnectionStore.getState().setError('Some error');
      useConnectionStore.getState().setError(null);
      expect(useConnectionStore.getState().error).toBeNull();
    });
  });

  describe('setLastConnectedAt', () => {
    it('records the last connection timestamp', () => {
      const now = Date.now();
      useConnectionStore.getState().setLastConnectedAt(now);
      expect(useConnectionStore.getState().lastConnectedAt).toBe(now);
    });
  });
});
