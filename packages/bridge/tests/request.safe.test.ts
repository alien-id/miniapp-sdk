import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
} from '../src/errors';
import { emit } from '../src/events';
import { request } from '../src/request';

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

test('request.ifAvailable - should return ok:true with response data', async () => {
  const customReqId = 'test-safe-req-123';
  const promise = request.ifAvailable(
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

test('request.ifAvailable - should return ok:false with BridgeUnavailableError when bridge unavailable', async () => {
  delete mockWindow.__miniAppsBridge__;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const result = await request.ifAvailable(
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

test('request.ifAvailable - should return ok:false with BridgeMethodUnsupportedError when version check fails', async () => {
  const result = await request.ifAvailable(
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

test('request.ifAvailable - should return ok:false on timeout instead of throwing', async () => {
  const result = await request.ifAvailable(
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

test('request.ifAvailable - should never throw', async () => {
  delete (globalThis as { window?: unknown }).window;

  // Should not throw, returns result instead
  const result = await request.ifAvailable(
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

test('request.ifAvailable - version override flows through to the request execution', async () => {
  // Regression: previously the success path delegated to public `request()`,
  // which re-gated on launch-param contractVersion and ignored the override.
  // Setup launch-param version 0.0.9 (where payment:request, which needs 0.1.1,
  // is not Callable). Pass `version: '1.0.0'` override (where it IS Callable)
  // and expect the request to actually proceed end-to-end.
  (mockWindow as Record<string, unknown>).__ALIEN_AUTH_TOKEN__ = 'token';
  (mockWindow as Record<string, unknown>).__ALIEN_CONTRACT_VERSION__ = '0.0.9';
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const customReqId = 'override-flow-test-req';
  const promise = request.ifAvailable(
    'payment:request',
    {
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    },
    'payment:response',
    { reqId: customReqId, version: '1.0.0' },
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
    expect(result.data.status).toBe('paid');
    expect(result.data.reqId).toBe(customReqId);
  }
}, 200);
