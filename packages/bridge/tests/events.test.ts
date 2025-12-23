import { afterEach, beforeEach, expect, test } from 'bun:test';
import type { EventPayload } from '@alien-id/contract';
import { emit, off, on } from '../src/events';

// Mock window for tests - only mock what's actually needed
let mockWindow: {
  addEventListener: (
    type: string,
    handler: (event: MessageEvent) => void,
  ) => void;
  removeEventListener: (
    type: string,
    handler: (event: MessageEvent) => void,
  ) => void;
  __miniAppsBridge__?: {
    postMessage: (data: string) => void;
  };
};

beforeEach(() => {
  const bridgePostMessageFn = () => {
    // No-op for these tests
  };

  mockWindow = {
    addEventListener: () => {
      // No-op for these tests
    },
    removeEventListener: () => {
      // No-op for these tests
    },
    __miniAppsBridge__: {
      postMessage: bridgePostMessageFn,
    },
  };

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

test('on - should register event listener', async () => {
  let received = false;
  const removeListener = on('auth.init:response.token', () => {
    received = true;
  });

  await emit('auth.init:response.token', { token: 'test-token', reqId: '123' });
  expect(received).toBe(true);

  removeListener();
});

test('on - should remove listener when cleanup function is called', async () => {
  let callCount = 0;
  const removeListener = on('auth.init:response.token', () => {
    callCount++;
  });

  await emit('auth.init:response.token', { token: 'test-token', reqId: '123' });
  expect(callCount).toBe(1);

  removeListener();
  await emit('auth.init:response.token', { token: 'test-token', reqId: '456' });
  expect(callCount).toBe(1);
});

test('off - should remove specific listener', async () => {
  let callCount1 = 0;
  let callCount2 = 0;

  const listener1 = () => {
    callCount1++;
  };
  const listener2 = () => {
    callCount2++;
  };

  on('auth.init:response.token', listener1);
  on('auth.init:response.token', listener2);

  await emit('auth.init:response.token', { token: 'test-token', reqId: '123' });
  expect(callCount1).toBe(1);
  expect(callCount2).toBe(1);

  off('auth.init:response.token', listener1);
  await emit('auth.init:response.token', { token: 'test-token', reqId: '456' });
  expect(callCount1).toBe(1);
  expect(callCount2).toBe(2);
});

test('emit - should emit to all registered listeners', async () => {
  let callCount = 0;
  on('auth.init:response.token', () => {
    callCount++;
  });
  on('auth.init:response.token', () => {
    callCount++;
  });

  await emit('auth.init:response.token', { token: 'test-token', reqId: '123' });
  expect(callCount).toBe(2);
});

test('emit - should pass correct payload', async () => {
  let receivedPayload: EventPayload<'auth.init:response.token'> | undefined;
  on('auth.init:response.token', (payload) => {
    receivedPayload = payload;
  });

  const testPayload: EventPayload<'auth.init:response.token'> = {
    token: 'test-token',
    reqId: '123',
  };
  await emit('auth.init:response.token', testPayload);
  expect(receivedPayload).not.toBeNull();
  expect(receivedPayload).toEqual(testPayload);
});
