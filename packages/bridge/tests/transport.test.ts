import { afterEach, beforeEach, expect, test } from 'bun:test';
import type { Message } from '../src/transport';
import { sendMessage, setupMessageListener } from '../src/transport';

// Mock window object
let mockWindow: {
  parent: Window | typeof mockWindow;
  __miniAppsBridge__?: { postMessage: (data: string) => void };
  postMessage: (message: unknown, targetOrigin: string) => void;
  addEventListener: (
    type: string,
    handler: (event: MessageEvent) => void,
  ) => void;
  removeEventListener: (
    type: string,
    handler: (event: MessageEvent) => void,
  ) => void;
};

let messageHandlers: Array<(event: MessageEvent) => void> = [];
let postMessageCalls: Array<{ message: unknown; targetOrigin: string }> = [];
let bridgePostMessageCalls: Array<string> = [];

beforeEach(() => {
  postMessageCalls = [];
  bridgePostMessageCalls = [];
  messageHandlers = [];

  const parentPostMessage = (message: unknown, targetOrigin: string) => {
    postMessageCalls.push({ message, targetOrigin });
  };

  mockWindow = {
    parent: {
      postMessage: parentPostMessage,
    } as Window,
    postMessage: (message: unknown, targetOrigin: string) => {
      postMessageCalls.push({ message, targetOrigin });
    },
    addEventListener: (
      _type: string,
      handler: (event: MessageEvent) => void,
    ) => {
      messageHandlers.push(handler);
    },
    removeEventListener: (
      _type: string,
      handler: (event: MessageEvent) => void,
    ) => {
      const index = messageHandlers.indexOf(handler);
      if (index > -1) {
        messageHandlers.splice(index, 1);
      }
    },
  };

  // Mock global window - ensure it's accessible
  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

test('sendMessage - should use native bridge if available', () => {
  const bridge = {
    postMessage: (data: string) => {
      bridgePostMessageCalls.push(data);
    },
  };

  mockWindow.__miniAppsBridge__ = bridge;
  // Update the global window reference
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const message: Message = {
    type: 'method',
    name: 'auth.init:request',
    payload: { appId: 'test', challenge: 'challenge', reqId: '123' },
  };

  sendMessage(message);

  expect(bridgePostMessageCalls.length).toBe(1);
  expect(bridgePostMessageCalls[0]).toEqual(JSON.stringify(message));
  expect(postMessageCalls.length).toBe(0);
});

test('sendMessage - should log warning and throw if bridge not available', () => {
  delete mockWindow.__miniAppsBridge__;
  // Update the global window reference
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const message: Message = {
    type: 'event',
    name: 'auth.init:response.token',
    payload: { token: 'test', reqId: '123' },
  };

  // Mock console.error to verify error is logged
  const originalError = console.error;
  const errorCalls: unknown[] = [];
  console.error = (...args: unknown[]) => {
    errorCalls.push(...args);
  };

  // Should throw error if bridge is not available
  expect(() => sendMessage(message)).toThrow();

  // Verify error was logged
  expect(errorCalls.length).toBeGreaterThan(0);
  expect(
    errorCalls.some(
      (arg) =>
        typeof arg === 'string' && arg.includes('bridge is not available'),
    ),
  ).toBe(true);

  // Verify message was not sent
  expect(postMessageCalls.length).toBe(0);
  expect(bridgePostMessageCalls.length).toBe(0);

  // Restore console.error
  console.error = originalError;
});

test('sendMessage - should log warning if window is undefined (SSR)', () => {
  // Delete window to simulate SSR environment
  delete (globalThis as { window?: unknown }).window;

  const message: Message = {
    type: 'event',
    name: 'auth.init:response.token',
    payload: { token: 'test', reqId: '123' },
  };

  // Mock console.warn to verify warning is logged
  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    warnCalls.push(...args);
  };

  // Should not throw, just log warning
  expect(() => sendMessage(message)).not.toThrow();

  // Verify warning was logged
  expect(warnCalls.length).toBeGreaterThan(0);
  expect(
    warnCalls.some(
      (arg) =>
        typeof arg === 'string' && arg.includes('window is not available'),
    ),
  ).toBe(true);

  // Restore console.warn and window
  console.warn = originalWarn;
  // Restore window for other tests
  (globalThis as { window: typeof mockWindow }).window = mockWindow;
});

test('setupMessageListener - should handle object messages', () => {
  // Update the global window reference
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const receivedMessages: Message[] = [];
  const unsubscribe = setupMessageListener((message) => {
    receivedMessages.push(message);
  });

  const testMessage: Message = {
    type: 'event',
    name: 'auth.init:response.token',
    payload: { token: 'test', reqId: '123' },
  };

  // Simulate receiving a message
  const event = new MessageEvent('message', {
    data: testMessage,
  });

  messageHandlers[0]?.(event);

  expect(receivedMessages.length).toBe(1);
  expect(receivedMessages[0]).toEqual(testMessage);

  unsubscribe();
});

test('setupMessageListener - should handle stringified messages', () => {
  // Update the global window reference
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const receivedMessages: Message[] = [];
  const unsubscribe = setupMessageListener((message) => {
    receivedMessages.push(message);
  });

  const testMessage: Message = {
    type: 'method',
    name: 'auth.init:request',
    payload: { appId: 'test', challenge: 'challenge', reqId: '123' },
  };

  // Simulate receiving a stringified message
  const event = new MessageEvent('message', {
    data: JSON.stringify(testMessage),
  });

  messageHandlers[0]?.(event);

  expect(receivedMessages.length).toBe(1);
  expect(receivedMessages[0]).toEqual(testMessage);

  unsubscribe();
});

test('setupMessageListener - should ignore invalid messages', () => {
  // Update the global window reference
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const receivedMessages: Message[] = [];
  const unsubscribe = setupMessageListener((message) => {
    receivedMessages.push(message);
  });

  // Invalid message (missing type)
  const invalidEvent1 = new MessageEvent('message', {
    data: { name: 'test', payload: {} },
  });
  messageHandlers[0]?.(invalidEvent1);

  // Invalid JSON string
  const invalidEvent2 = new MessageEvent('message', {
    data: 'not valid json{',
  });
  messageHandlers[0]?.(invalidEvent2);

  // Non-object data
  const invalidEvent3 = new MessageEvent('message', {
    data: 123,
  });
  messageHandlers[0]?.(invalidEvent3);

  expect(receivedMessages.length).toBe(0);

  unsubscribe();
});

test('setupMessageListener - should return cleanup function', () => {
  // Update the global window reference
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const unsubscribe = setupMessageListener(() => {});

  expect(typeof unsubscribe).toBe('function');
  expect(messageHandlers.length).toBe(1);

  unsubscribe();

  expect(messageHandlers.length).toBe(0);
});
