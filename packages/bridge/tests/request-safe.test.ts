import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
} from '../src/errors';
import { emit } from '../src/events';
import { requestIfAvailable } from '../src/request-safe';

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
  mockWindow = {
    addEventListener: () => {},
    removeEventListener: () => {},
    __miniAppsBridge__: {
      postMessage: () => {},
    },
  };

  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

test('requestIfAvailable - should return ok:true with response data', async () => {
  const customReqId = 'test-safe-req-123';
  const promise = requestIfAvailable(
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
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.data.reqId).toBe(customReqId);
  }
}, 100);

test('requestIfAvailable - should return ok:false with BridgeUnavailableError when bridge unavailable', async () => {
  delete mockWindow.__miniAppsBridge__;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const result = await requestIfAvailable(
    'payment:request',
    {
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    },
    'payment:response',
  );

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(BridgeUnavailableError);
  }
});

test('requestIfAvailable - should return ok:false with BridgeMethodUnsupportedError when version check fails', async () => {
  const result = await requestIfAvailable(
    'payment:request',
    {
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    },
    'payment:response',
    { version: '0.0.0' },
  );

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(BridgeMethodUnsupportedError);
  }
});

test('requestIfAvailable - should return ok:false on timeout instead of throwing', async () => {
  const result = await requestIfAvailable(
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

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(BridgeTimeoutError);
  }
}, 200);

test('requestIfAvailable - should never throw', async () => {
  delete (globalThis as { window?: unknown }).window;

  // Should not throw, returns result instead
  const result = await requestIfAvailable(
    'payment:request',
    {
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    },
    'payment:response',
  );

  expect(result.ok).toBe(false);
});
