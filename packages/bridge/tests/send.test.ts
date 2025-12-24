import { afterEach, beforeEach, expect, test } from 'bun:test';
import { BridgeUnavailableError } from '../src/errors';
import { send } from '../src/send';

// Mock window object
let mockWindow: {
  __miniAppsBridge__?: { postMessage: (data: string) => void };
};

let bridgePostMessageCalls: Array<string> = [];

beforeEach(() => {
  bridgePostMessageCalls = [];

  mockWindow = {};

  // Mock global window
  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

test('send - should send app:ready method with empty payload', () => {
  const bridge = {
    postMessage: (data: string) => {
      bridgePostMessageCalls.push(data);
    },
  };

  mockWindow.__miniAppsBridge__ = bridge;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  send('app:ready', {});

  expect(bridgePostMessageCalls.length).toBe(1);
  const sentMessage = JSON.parse(bridgePostMessageCalls[0] as string);
  expect(sentMessage).toEqual({
    type: 'method',
    name: 'app:ready',
    payload: {},
  });
});

test('send - should send method without waiting for response', () => {
  const bridge = {
    postMessage: (data: string) => {
      bridgePostMessageCalls.push(data);
    },
  };

  mockWindow.__miniAppsBridge__ = bridge;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  // send is synchronous and doesn't return a promise
  const result = send('app:ready', {});

  expect(result).toBeUndefined();
  expect(bridgePostMessageCalls.length).toBe(1);
});

test('send - should throw BridgeUnavailableError if bridge not available', () => {
  delete mockWindow.__miniAppsBridge__;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  expect(() => send('app:ready', {})).toThrow(BridgeUnavailableError);
  expect(bridgePostMessageCalls.length).toBe(0);
});

test('send - should throw BridgeUnavailableError if window is undefined (SSR)', () => {
  delete (globalThis as { window?: unknown }).window;

  expect(() => send('app:ready', {})).toThrow(BridgeUnavailableError);
  expect(bridgePostMessageCalls.length).toBe(0);

  // Restore window for other tests
  (globalThis as { window: typeof mockWindow }).window = mockWindow;
});

test('send - should send method with correct message format', () => {
  const bridge = {
    postMessage: (data: string) => {
      bridgePostMessageCalls.push(data);
    },
  };

  mockWindow.__miniAppsBridge__ = bridge;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  send('app:ready', {});

  const sentMessage = JSON.parse(bridgePostMessageCalls[0] as string);
  expect(sentMessage.type).toBe('method');
  expect(sentMessage.name).toBe('app:ready');
  expect(sentMessage.payload).toEqual({});
});
