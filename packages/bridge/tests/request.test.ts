import { afterEach, beforeEach, expect, test } from 'bun:test';
import { emit } from '../src/events';
import { request } from '../src/request';

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

test('request - should wait for response with matching reqId', async () => {
  const customReqId = 'test-req-123';
  const promise = request(
    'payment:request',
    {
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    },
    'payment:response',
    { reqId: customReqId },
  );

  setTimeout(() => {
    emit('payment:response', {
      status: 'paid' as const,
      txHash: 'tx-hash',
      reqId: customReqId,
    });
  }, 10);

  const result = await promise;
  expect(result).toBeDefined();
  expect(result.reqId).toBe(customReqId);
}, 100);

test('request - should support custom reqId', async () => {
  const customReqId = 'custom-123';
  const promise = request(
    'payment:request',
    {
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    },
    'payment:response',
    { reqId: customReqId },
  );

  setTimeout(() => {
    emit('payment:response', {
      status: 'paid' as const,
      txHash: 'tx-hash',
      reqId: customReqId,
    });
  }, 10);

  const result = await promise;
  expect(result.reqId).toBe(customReqId);
}, 100);

test('request - should timeout if no response', async () => {
  const promise = request(
    'payment:request',
    {
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    },
    'payment:response',
    { timeout: 50 },
  );

  expect(promise).rejects.toThrow('Request timeout');
}, 100);

test('request - should ignore responses with different reqId', async () => {
  const promise = request(
    'payment:request',
    {
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    },
    'payment:response',
    { reqId: 'req-1' },
  );

  setTimeout(() => {
    emit('payment:response', {
      status: 'paid' as const,
      txHash: 'tx-hash',
      reqId: 'req-2',
    });
  }, 10);

  setTimeout(() => {
    emit('payment:response', {
      status: 'paid' as const,
      txHash: 'tx-hash',
      reqId: 'req-1',
    });
  }, 50);

  const result = await promise;
  expect(result.reqId).toBe('req-1');
}, 100);
