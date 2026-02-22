import { describe, it, expect } from 'vitest';
import {
  createConnectFrame,
  createRequestFrame,
  parseFrame,
  isResponseFrame,
  isEventFrame,
  isRequestFrame,
} from '../protocol';

describe('protocol', () => {
  describe('createConnectFrame', () => {
    it('creates a request frame with type "req" and method "connect"', () => {
      const frame = createConnectFrame('test-token');
      expect(frame.type).toBe('req');
      expect(frame.method).toBe('connect');
      expect(frame.id).toMatch(/^ui_\d+_\d+$/);
    });

    it('includes the provided auth token in params', () => {
      const frame = createConnectFrame('my-secret-token');
      expect(frame.params?.auth).toEqual({ token: 'my-secret-token' });
    });

    it('uses empty string for token when none is provided', () => {
      const frame = createConnectFrame();
      expect(frame.params?.auth).toEqual({ token: '' });
    });

    it('includes correct client metadata', () => {
      const frame = createConnectFrame();
      const client = frame.params?.client as Record<string, unknown>;
      expect(client.id).toBe('gateway-client');
      expect(client.version).toBe('0.1.0');
      expect(client.platform).toBe('web');
      expect(client.mode).toBe('ui');
      expect(client.displayName).toBe('Clawkins Homebase');
    });

    it('requests protocol v3', () => {
      const frame = createConnectFrame();
      expect(frame.params?.minProtocol).toBe(3);
      expect(frame.params?.maxProtocol).toBe(3);
    });

    it('includes operator role and scopes', () => {
      const frame = createConnectFrame();
      expect(frame.params?.role).toBe('operator');
      expect(frame.params?.scopes).toEqual(['operator.read', 'operator.write']);
    });

    it('generates unique frame ids', () => {
      const frame1 = createConnectFrame();
      const frame2 = createConnectFrame();
      expect(frame1.id).not.toBe(frame2.id);
    });
  });

  describe('createRequestFrame', () => {
    it('creates a request frame with the given method', () => {
      const frame = createRequestFrame('list_agents');
      expect(frame.type).toBe('req');
      expect(frame.method).toBe('list_agents');
      expect(frame.id).toMatch(/^ui_\d+_\d+$/);
    });

    it('includes params when provided', () => {
      const params = { agentId: 'abc', limit: 10 };
      const frame = createRequestFrame('get_sessions', params);
      expect(frame.params).toEqual(params);
    });

    it('has undefined params when none are provided', () => {
      const frame = createRequestFrame('ping');
      expect(frame.params).toBeUndefined();
    });
  });

  describe('parseFrame', () => {
    it('parses a valid response frame', () => {
      const data = JSON.stringify({ type: 'res', id: 'req_1', ok: true, payload: { status: 'ok' } });
      const frame = parseFrame(data);
      expect(frame).not.toBeNull();
      expect(frame!.type).toBe('res');
      expect((frame as { id: string }).id).toBe('req_1');
    });

    it('parses a valid event frame', () => {
      const data = JSON.stringify({ type: 'event', event: 'session.started', payload: { sessionId: 's1' }, seq: 42 });
      const frame = parseFrame(data);
      expect(frame).not.toBeNull();
      expect(frame!.type).toBe('event');
      expect((frame as { event: string }).event).toBe('session.started');
      expect((frame as { seq: number }).seq).toBe(42);
    });

    it('parses a valid request frame', () => {
      const data = JSON.stringify({ type: 'req', id: 'gw_1', method: 'heartbeat' });
      const frame = parseFrame(data);
      expect(frame).not.toBeNull();
      expect(frame!.type).toBe('req');
      expect((frame as { method: string }).method).toBe('heartbeat');
    });

    it('returns null for invalid JSON', () => {
      expect(parseFrame('not json')).toBeNull();
    });

    it('returns null when type is missing', () => {
      expect(parseFrame(JSON.stringify({ id: 'no-type' }))).toBeNull();
    });

    it('returns null for unknown frame types', () => {
      expect(parseFrame(JSON.stringify({ type: 'unknown', id: '1' }))).toBeNull();
    });

    it('returns null for null input parsed as JSON', () => {
      expect(parseFrame('null')).toBeNull();
    });

    it('returns null when type is not a string', () => {
      expect(parseFrame(JSON.stringify({ type: 123 }))).toBeNull();
    });
  });

  describe('type guard functions', () => {
    it('isResponseFrame returns true for response frames', () => {
      const frame = parseFrame(JSON.stringify({ type: 'res', id: '1', ok: true }))!;
      expect(isResponseFrame(frame)).toBe(true);
      expect(isEventFrame(frame)).toBe(false);
      expect(isRequestFrame(frame)).toBe(false);
    });

    it('isEventFrame returns true for event frames', () => {
      const frame = parseFrame(JSON.stringify({ type: 'event', event: 'test' }))!;
      expect(isEventFrame(frame)).toBe(true);
      expect(isResponseFrame(frame)).toBe(false);
      expect(isRequestFrame(frame)).toBe(false);
    });

    it('isRequestFrame returns true for request frames', () => {
      const frame = parseFrame(JSON.stringify({ type: 'req', id: '1', method: 'test' }))!;
      expect(isRequestFrame(frame)).toBe(true);
      expect(isResponseFrame(frame)).toBe(false);
      expect(isEventFrame(frame)).toBe(false);
    });
  });
});
