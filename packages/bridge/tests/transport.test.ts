import { afterEach, beforeEach, expect, test } from 'bun:test';
import type { Message } from '../src/transport';
import { sendMessage, setupMessageListener } from '../src/transport';

// Mock window object
let mockWindow: {
  parent: Window | typeof mockWindow;
  __miniAppsBridge__?: { postMessage: (data: Message) => void };
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
let bridgePostMessageCalls: Array<Message> = [];

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
    postMessage: (data: Message) => {
      bridgePostMessageCalls.push(data);
    },
  };

  mockWindow.__miniAppsBridge__ = bridge;
  // Update the global window reference
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const message: Message = {
    type: 'method',
    name: 'auth::init::request',
    payload: { appId: 'test', challenge: 'challenge', reqId: '123' },
  };

  sendMessage(message);

  expect(bridgePostMessageCalls.length).toBe(1);
  expect(bridgePostMessageCalls[0]).toEqual(message);
  expect(postMessageCalls.length).toBe(0);
});

test('sendMessage - should fallback to postMessage if bridge not available', () => {
  delete mockWindow.__miniAppsBridge__;
  mockWindow.parent = mockWindow; // Not in iframe
  // Update the global window reference
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const message: Message = {
    type: 'event',
    name: 'auth::init::token',
    payload: { token: 'test', reqId: '123' },
  };

  sendMessage(message);

  expect(postMessageCalls.length).toBe(1);
  const call = postMessageCalls[0];
  if (!call) {
    throw new Error('Expected postMessage call to exist');
  }
  expect(call.message).toEqual(message);
  expect(call.targetOrigin).toBe('*');
});

test('sendMessage - should use window.parent.postMessage in iframe', () => {
  delete mockWindow.__miniAppsBridge__;
  const parentWindow = {
    postMessage: (message: unknown, targetOrigin: string) => {
      postMessageCalls.push({ message, targetOrigin });
    },
  } as Window;
  mockWindow.parent = parentWindow;
  // Update the global window reference
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const message: Message = {
    type: 'event',
    name: 'auth::init::token',
    payload: { token: 'test', reqId: '123' },
  };

  sendMessage(message);

  expect(postMessageCalls.length).toBe(1);
  const call = postMessageCalls[0];
  if (!call) {
    throw new Error('Expected postMessage call to exist');
  }
  expect(call.message).toEqual(message);
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
    name: 'auth::init::token',
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
    name: 'auth::init::request',
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

