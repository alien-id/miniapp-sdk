import { afterEach, beforeEach, expect, test } from 'bun:test';
import { emit } from '../src/events';
import { request } from '../src/request';

// Mock window for tests
let mockWindow: {
  parent: typeof mockWindow;
  postMessage: (message: unknown, targetOrigin: string) => void;
  addEventListener: (
    type: string,
    handler: (event: MessageEvent) => void,
  ) => void;
  removeEventListener: (
    type: string,
    handler: (event: MessageEvent) => void,
  ) => void;
};

beforeEach(() => {
  const postMessageFn = () => {
    // No-op for these tests
  };

  mockWindow = {
    parent: {} as typeof mockWindow,
    postMessage: postMessageFn,
    addEventListener: () => {
      // No-op for these tests
    },
    removeEventListener: () => {
      // No-op for these tests
    },
  };

  // Set parent to self to indicate not in iframe
  mockWindow.parent = mockWindow;

  // Set up global window mock
  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

test('request - should wait for response with matching reqId', async () => {
  const customReqId = 'test-req-123';
  const promise = request(
    'auth.init:request',
    { appId: 'test-app', challenge: 'test-challenge' },
    'auth.init:response.token',
    { reqId: customReqId },
  );

  setTimeout(() => {
    emit('auth.init:response.token', { token: 'test-token', reqId: customReqId });
  }, 10);

  const result = await promise;
  expect(result).toBeDefined();
  expect(result.reqId).toBe(customReqId);
}, 100);

test('request - should support custom reqId', async () => {
  const customReqId = 'custom-123';
  const promise = request(
    'auth.init:request',
    { appId: 'test-app', challenge: 'test-challenge' },
    'auth.init:response.token',
    { reqId: customReqId },
  );

  setTimeout(() => {
    emit('auth.init:response.token', { token: 'test-token', reqId: customReqId });
  }, 10);

  const result = await promise;
  expect(result.reqId).toBe(customReqId);
}, 100);

test('request - should timeout if no response', async () => {
  const promise = request(
    'auth.init:request',
    { appId: 'test-app', challenge: 'test-challenge' },
    'auth.init:response.token',
    { timeout: 50 },
  );

  expect(promise).rejects.toThrow('Request timeout');
}, 100);

test('request - should ignore responses with different reqId', async () => {
  const promise = request(
    'auth.init:request',
    { appId: 'test-app', challenge: 'test-challenge' },
    'auth.init:response.token',
    { reqId: 'req-1' },
  );

  setTimeout(() => {
    emit('auth.init:response.token', { token: 'test-token', reqId: 'req-2' });
  }, 10);

  setTimeout(() => {
    emit('auth.init:response.token', { token: 'test-token', reqId: 'req-1' });
  }, 50);

  const result = await promise;
  expect(result.reqId).toBe('req-1');
}, 100);
