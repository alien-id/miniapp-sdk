import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
  BridgeError,
  BridgeMethodUnsupportedError,
  BridgeUnavailableError,
} from '../src/errors';
import { clearMockLaunchParams } from '../src/launch-params';
import { send } from '../src/send';

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
  clearMockLaunchParams();
  delete (globalThis as { window?: unknown }).window;
});

test('send.ifAvailable - should return ok:true when bridge is available', () => {
  mockWindow.__miniAppsBridge__ = {
    postMessage: (data: string) => {
      bridgePostMessageCalls.push(data);
    },
  };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const result = send.ifAvailable('app:ready', {});

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.data).toBeUndefined();
  }
  expect(bridgePostMessageCalls.length).toBe(1);
});

test('send.ifAvailable - should return ok:false with BridgeUnavailableError when bridge is not available', () => {
  delete mockWindow.__miniAppsBridge__;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const result = send.ifAvailable('app:ready', {});

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(BridgeUnavailableError);
  }
  expect(bridgePostMessageCalls.length).toBe(0);
});

test('send.ifAvailable - should return ok:false when window is undefined', () => {
  delete (globalThis as { window?: unknown }).window;

  const result = send.ifAvailable('app:ready', {});

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(BridgeUnavailableError);
  }
});

test('send.ifAvailable - should return ok:true with version check that passes', () => {
  mockWindow.__miniAppsBridge__ = {
    postMessage: (data: string) => {
      bridgePostMessageCalls.push(data);
    },
  };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const result = send.ifAvailable('app:ready', {}, { version: '1.0.0' });

  expect(result.ok).toBe(true);
  expect(bridgePostMessageCalls.length).toBe(1);
});

test('send.ifAvailable - should return ok:false with BridgeMethodUnsupportedError when version check fails', () => {
  mockWindow.__miniAppsBridge__ = {
    postMessage: (data: string) => {
      bridgePostMessageCalls.push(data);
    },
  };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const result = send.ifAvailable(
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

test('send.ifAvailable - should default version to launchParams contractVersion', () => {
  mockWindow.__miniAppsBridge__ = {
    postMessage: (data: string) => {
      bridgePostMessageCalls.push(data);
    },
  };
  (mockWindow as Record<string, unknown>).__ALIEN_AUTH_TOKEN__ = 'token';
  (mockWindow as Record<string, unknown>).__ALIEN_CONTRACT_VERSION__ = '0.0.9';
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  // No explicit version option; should pick up 0.0.9 from launchParams.
  // payment:request requires 0.1.1, so it should be rejected.
  const result = send.ifAvailable('payment:request', {
    recipient: '',
    amount: '',
    token: '',
    network: '',
    invoice: '',
    reqId: '',
  });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(BridgeMethodUnsupportedError);
  }
  expect(bridgePostMessageCalls.length).toBe(0);
});

test('send.ifAvailable - wraps non-BridgeError transport throws with cause propagation', () => {
  // When transport.sendMessage throws a non-BridgeError (e.g., JSON.stringify
  // on a cyclic payload), the Safe Track must wrap it in BridgeError but
  // keep the original error reachable via `.cause` for post-mortem debugging.
  //
  // Cross-package contract: this depends on Agent #2's `BridgeError`
  // constructor accepting `{ cause }` as a second arg (ES2022 Error option).
  // If Agent #2 hasn't shipped that yet, this test fails on the cause
  // assertion — that's the intended signal to coordinate the merge.
  const originalError = new TypeError('cyclic');
  mockWindow.__miniAppsBridge__ = {
    postMessage: () => {
      throw originalError;
    },
  };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const result = send.ifAvailable('app:ready', {});

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(BridgeError);
    expect(result.error.cause).toBe(originalError);
  }
});

test('send.ifAvailable - should never throw', () => {
  delete (globalThis as { window?: unknown }).window;

  // Should not throw, even without bridge
  expect(() => {
    const result = send.ifAvailable('app:ready', {});
    expect(result.ok).toBe(false);
  }).not.toThrow();
});
