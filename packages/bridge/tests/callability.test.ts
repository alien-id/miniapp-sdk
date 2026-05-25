import { afterEach, beforeEach, expect, test } from 'bun:test';
import { callability, gate } from '../src/callability';
import {
  BridgeMethodUnsupportedError,
  BridgeUnavailableError,
} from '../src/errors';
import { mockLaunchParamsForDev } from '../src/launch-params';

let mockWindow: {
  __miniAppsBridge__?: { postMessage: (data: string) => void };
};

beforeEach(() => {
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

test('callability - returns no-bridge when window has no bridge', () => {
  delete mockWindow.__miniAppsBridge__;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  expect(callability('app:ready')).toEqual({
    callable: false,
    reason: 'no-bridge',
  });
});

test('callability - returns no-bridge when window is undefined (SSR)', () => {
  delete (globalThis as { window?: unknown }).window;

  expect(callability('app:ready')).toEqual({
    callable: false,
    reason: 'no-bridge',
  });
});

test('callability - returns callable:true when bridge present and no version provided', () => {
  mockWindow.__miniAppsBridge__ = { postMessage: () => {} };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  expect(callability('payment:request')).toEqual({ callable: true });
});

test('callability - returns callable:true when bridge present and version supports method', () => {
  mockWindow.__miniAppsBridge__ = { postMessage: () => {} };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  expect(callability('app:ready', { version: '1.0.0' })).toEqual({
    callable: true,
  });
});

test('callability - returns host-outdated when version is below method min', () => {
  mockWindow.__miniAppsBridge__ = { postMessage: () => {} };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  // payment:request introduced in 0.1.1; 0.0.9 only has app:ready
  expect(callability('payment:request', { version: '0.0.9' })).toEqual({
    callable: false,
    reason: 'host-outdated',
    needs: '0.1.1',
    has: '0.0.9',
  });
});

test('callability - host-outdated takes precedence over callable:true via version gate', () => {
  mockWindow.__miniAppsBridge__ = { postMessage: () => {} };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  // wallet.solana:connect introduced in 1.0.0
  const result = callability('wallet.solana:connect', { version: '0.2.4' });
  expect(result).toEqual({
    callable: false,
    reason: 'host-outdated',
    needs: '1.0.0',
    has: '0.2.4',
  });
});

test('callability - no-bridge takes precedence over host-outdated', () => {
  delete mockWindow.__miniAppsBridge__;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  // Even with a stale version, no-bridge is reported first
  expect(callability('payment:request', { version: '0.0.9' })).toEqual({
    callable: false,
    reason: 'no-bridge',
  });
});

test('callability - fails closed when method has no known min version (registry drift)', () => {
  mockWindow.__miniAppsBridge__ = { postMessage: () => {} };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  // Simulate registry drift / cast bypass — `MethodName` typing usually
  // prevents this at compile time, but the runtime must still fail closed.
  // Documented invariant: when getMethodMinVersion returns undefined, the
  // returned `needs` field mirrors `has` so the discriminated union shape
  // stays valid (`needs: Version`, never undefined). Locking the full
  // shape here so future contributors don't silently change it.
  // biome-ignore lint/suspicious/noExplicitAny: deliberate test bypass
  const result = callability('bogus:not-registered' as any, {
    version: '1.0.0',
  });
  expect(result).toEqual({
    callable: false,
    reason: 'host-outdated',
    needs: '1.0.0',
    has: '1.0.0',
  });
});

test('gate - returns BridgeUnavailableError when bridge is not present', () => {
  delete mockWindow.__miniAppsBridge__;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  expect(gate('app:ready')).toBeInstanceOf(BridgeUnavailableError);
});

test('gate - returns undefined when bridge is present and no version is known', () => {
  mockWindow.__miniAppsBridge__ = { postMessage: () => {} };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  expect(gate('app:ready')).toBeUndefined();
});

test('gate - falls back to launch-params version when options.version is omitted', () => {
  mockWindow.__miniAppsBridge__ = { postMessage: () => {} };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;
  mockLaunchParamsForDev({ authToken: 'tok', contractVersion: '0.0.9' });

  // wallet.solana:connect requires 1.0.0; launch-params has 0.0.9 → outdated.
  expect(gate('wallet.solana:connect')).toBeInstanceOf(
    BridgeMethodUnsupportedError,
  );
});

test('gate - options.version overrides the launch-params version', () => {
  mockWindow.__miniAppsBridge__ = { postMessage: () => {} };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;
  mockLaunchParamsForDev({ authToken: 'tok', contractVersion: '0.0.9' });

  // Override to 1.0.0 → method becomes Callable, no error.
  expect(gate('wallet.solana:connect', { version: '1.0.0' })).toBeUndefined();
});

// Type-level test: confirm `MethodName` is a literal union that rejects
// arbitrary strings at the call site. This function is never invoked —
// the assertion lives entirely in the type system. If any `@ts-expect-error`
// stops failing, `MethodName` has been widened to `string` (regression).
function _typeLevel_MethodName_isLiteralUnion(): void {
  // @ts-expect-error — arbitrary strings are not assignable to MethodName.
  callability('not:a:real:method');
  // @ts-expect-error — empty string is not a MethodName.
  callability('');
  // Sanity (no error): a known Method is accepted.
  callability('app:ready');
}
