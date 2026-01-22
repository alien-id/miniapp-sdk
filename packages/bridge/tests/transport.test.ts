import { afterEach, beforeEach, expect, test } from 'bun:test';
import { BridgeUnavailableError } from '../src/errors';
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
    name: 'payment:request',
    payload: {
      recipient: 'test',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
      reqId: '123',
    },
  };

  sendMessage(message);

  expect(bridgePostMessageCalls.length).toBe(1);
  expect(bridgePostMessageCalls[0]).toEqual(JSON.stringify(message));
  expect(postMessageCalls.length).toBe(0);
});

test('sendMessage - should throw BridgeUnavailableError if bridge not available', () => {
  delete mockWindow.__miniAppsBridge__;
  // Update the global window reference
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const message: Message = {
    type: 'event',
    name: 'payment:response',
    payload: { status: 'paid', txHash: 'tx123', reqId: '123' },
  };

  // Should throw BridgeUnavailableError if bridge is not available
  expect(() => sendMessage(message)).toThrow(BridgeUnavailableError);

  // Verify message was not sent
  expect(postMessageCalls.length).toBe(0);
  expect(bridgePostMessageCalls.length).toBe(0);
});

test('sendMessage - should throw BridgeUnavailableError if window is undefined (SSR)', () => {
  // Delete window to simulate SSR environment
  delete (globalThis as { window?: unknown }).window;

  const message: Message = {
    type: 'event',
    name: 'payment:response',
    payload: { status: 'paid', txHash: 'tx123', reqId: '123' },
  };

  // Should throw BridgeUnavailableError when window is undefined (getBridge returns undefined)
  expect(() => sendMessage(message)).toThrow(BridgeUnavailableError);

  // Verify message was not sent
  expect(postMessageCalls.length).toBe(0);
  expect(bridgePostMessageCalls.length).toBe(0);

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
    name: 'payment:response',
    payload: { status: 'paid', txHash: 'tx123', reqId: '123' },
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
    name: 'payment:request',
    payload: {
      recipient: 'test',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
      reqId: '123',
    },
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
