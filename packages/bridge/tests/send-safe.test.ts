import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
  BridgeMethodUnsupportedError,
  BridgeUnavailableError,
} from '../src/errors';
import { sendIfAvailable } from '../src/send-safe';

let mockWindow: {
  __miniAppsBridge__?: { postMessage: (data: string) => void };
};

let bridgePostMessageCalls: Array<string> = [];

beforeEach(() => {
  bridgePostMessageCalls = [];
  mockWindow = {};

  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

test('sendIfAvailable - should return ok:true when bridge is available', () => {
  mockWindow.__miniAppsBridge__ = {
    postMessage: (data: string) => {
      bridgePostMessageCalls.push(data);
    },
  };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const result = sendIfAvailable('app:ready', {});

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.data).toBeUndefined();
  }
  expect(bridgePostMessageCalls.length).toBe(1);
});

test('sendIfAvailable - should return ok:false with BridgeUnavailableError when bridge is not available', () => {
  delete mockWindow.__miniAppsBridge__;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const result = sendIfAvailable('app:ready', {});

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(BridgeUnavailableError);
  }
  expect(bridgePostMessageCalls.length).toBe(0);
});

test('sendIfAvailable - should return ok:false when window is undefined', () => {
  delete (globalThis as { window?: unknown }).window;

  const result = sendIfAvailable('app:ready', {});

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(BridgeUnavailableError);
  }
});

test('sendIfAvailable - should return ok:true with version check that passes', () => {
  mockWindow.__miniAppsBridge__ = {
    postMessage: (data: string) => {
      bridgePostMessageCalls.push(data);
    },
  };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const result = sendIfAvailable('app:ready', {}, { version: '1.0.0' });

  expect(result.ok).toBe(true);
  expect(bridgePostMessageCalls.length).toBe(1);
});

test('sendIfAvailable - should return ok:false with BridgeMethodUnsupportedError when version check fails', () => {
  mockWindow.__miniAppsBridge__ = {
    postMessage: (data: string) => {
      bridgePostMessageCalls.push(data);
    },
  };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const result = sendIfAvailable(
    'payment:request',
    {
      recipient: '',
      amount: '',
      token: '',
      network: '',
      invoice: '',
      reqId: '',
    },
    { version: '0.0.0' },
  );

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(BridgeMethodUnsupportedError);
    const err = result.error as BridgeMethodUnsupportedError;
    expect(err.method).toBe('payment:request');
    expect(err.contractVersion).toBe('0.0.0');
  }
  expect(bridgePostMessageCalls.length).toBe(0);
});

test('sendIfAvailable - should never throw', () => {
  delete (globalThis as { window?: unknown }).window;

  // Should not throw, even without bridge
  expect(() => {
    const result = sendIfAvailable('app:ready', {});
    expect(result.ok).toBe(false);
  }).not.toThrow();
});
