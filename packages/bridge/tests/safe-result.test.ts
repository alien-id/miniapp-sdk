import { afterEach, beforeEach, expect, test } from 'bun:test';
import { isAvailable } from '../src/safe-result';

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

test('isAvailable - should return true when bridge is available', () => {
  mockWindow.__miniAppsBridge__ = {
    postMessage: () => {},
  };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  expect(isAvailable('app:ready')).toBe(true);
});

test('isAvailable - should return false when bridge is not available', () => {
  delete mockWindow.__miniAppsBridge__;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  expect(isAvailable('app:ready')).toBe(false);
});

test('isAvailable - should return false when window is undefined', () => {
  delete (globalThis as { window?: unknown }).window;

  expect(isAvailable('app:ready')).toBe(false);
});

test('isAvailable - should return true when version check passes', () => {
  mockWindow.__miniAppsBridge__ = {
    postMessage: () => {},
  };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  // app:ready is in version 0.0.1, so 1.0.0 should support it
  expect(isAvailable('app:ready', { version: '1.0.0' })).toBe(true);
});

test('isAvailable - should return false when version check fails', () => {
  mockWindow.__miniAppsBridge__ = {
    postMessage: () => {},
  };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  // Use a version lower than any defined method
  expect(isAvailable('payment:request', { version: '0.0.0' })).toBe(false);
});

test('isAvailable - should skip version check when no version provided', () => {
  mockWindow.__miniAppsBridge__ = {
    postMessage: () => {},
  };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  // Without version option, only checks bridge availability
  expect(isAvailable('payment:request')).toBe(true);
});
