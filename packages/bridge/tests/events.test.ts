import { afterEach, beforeEach, expect, test } from 'bun:test';
import type { EventPayload } from '@alien-id/miniapps-contract';
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
  const removeListener = on('payment:response', () => {
    received = true;
  });

  await emit('payment:response', {
    status: 'paid' as const,
    txHash: 'tx-hash',
    reqId: '123',
  });
  expect(received).toBe(true);

  removeListener();
});

test('on - should remove listener when cleanup function is called', async () => {
  let callCount = 0;
  const removeListener = on('payment:response', () => {
    callCount++;
  });

  await emit('payment:response', {
    status: 'paid' as const,
    txHash: 'tx-hash',
    reqId: '123',
  });
  expect(callCount).toBe(1);

  removeListener();
  await emit('payment:response', {
    status: 'paid' as const,
    txHash: 'tx-hash',
    reqId: '456',
  });
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

  on('payment:response', listener1);
  on('payment:response', listener2);

  await emit('payment:response', {
    status: 'paid' as const,
    txHash: 'tx-hash',
    reqId: '123',
  });
  expect(callCount1).toBe(1);
  expect(callCount2).toBe(1);

  off('payment:response', listener1);
  await emit('payment:response', {
    status: 'paid' as const,
    txHash: 'tx-hash',
    reqId: '456',
  });
  expect(callCount1).toBe(1);
  expect(callCount2).toBe(2);
});

test('emit - should emit to all registered listeners', async () => {
  let callCount = 0;
  on('payment:response', () => {
    callCount++;
  });
  on('payment:response', () => {
    callCount++;
  });

  await emit('payment:response', {
    status: 'paid' as const,
    txHash: 'tx-hash',
    reqId: '123',
  });
  expect(callCount).toBe(2);
});

test('emit - should pass correct payload', async () => {
  let receivedPayload: EventPayload<'payment:response'> | undefined;
  on('payment:response', (payload) => {
    receivedPayload = payload;
  });

  const testPayload: EventPayload<'payment:response'> = {
    status: 'paid' as const,
    txHash: 'tx-hash',
    reqId: '123',
  };
  await emit('payment:response', testPayload);
  expect(receivedPayload).not.toBeNull();
  expect(receivedPayload).toEqual(testPayload);
});

test('transport listener - stays attached across full subscribe/unsubscribe cycles', async () => {
  // First subscriber attaches the transport listener.
  let receivedFirst = 0;
  const offFirst = on('payment:response', () => {
    receivedFirst++;
  });
  await emit('payment:response', {
    status: 'paid' as const,
    txHash: 'tx-1',
    reqId: 'r1',
  });
  expect(receivedFirst).toBe(1);

  // Drop to zero subscribers — the transport must NOT detach. A future
  // refactor that tears down on listenerCount==0 would break the next
  // assertion: a fresh subscriber to a different event must still work.
  offFirst();

  let receivedSecond = 0;
  const offSecond = on('host.back.button:clicked', () => {
    receivedSecond++;
  });
  await emit('host.back.button:clicked', undefined);
  expect(receivedSecond).toBe(1);

  offSecond();
});

test('on - async listeners are supported and their promise is awaited', async () => {
  const order: string[] = [];

  on('payment:response', async (_payload) => {
    await Promise.resolve();
    order.push('async-done');
  });

  await emit('payment:response', {
    status: 'paid' as const,
    txHash: 'tx-async',
    reqId: 'async',
  });
  order.push('after-emit');

  // `emit` awaits each listener (Emittery semantics) — so 'async-done'
  // must appear before 'after-emit'.
  expect(order).toEqual(['async-done', 'after-emit']);
});
