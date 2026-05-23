import { afterEach, beforeEach, expect, test } from 'bun:test';
import type {
  EventName,
  MethodName,
  MethodPayload,
} from '@alien-id/miniapps-contract';
import type { MockBridgeInstance } from '../src/mock';
import { createMockBridge } from '../src/mock';
import { request } from '../src/request';
import { send } from '../src/send';

/**
 * Source-of-truth list of every contract method that expects a response
 * event. Keep this in sync with @alien-id/miniapps-contract's request
 * surface — once the contract package exports a `RequestMethodName`
 * literal union, this file can switch to that and drop the manual list.
 *
 * The parity test below asserts that every method here has a response
 * mapping inside `createMockBridge` (otherwise calling the method in dev
 * would hang for 30 s instead of returning a mock payload).
 */
const REQUEST_METHODS: readonly {
  method: MethodName;
  responseEvent: EventName;
  // Minimal request params (no reqId — the bridge stamps that in).
  params: Record<string, unknown>;
}[] = [
  {
    method: 'payment:request',
    responseEvent: 'payment:response',
    params: {
      recipient: 'r',
      amount: '1',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv',
    },
  },
  {
    method: 'clipboard:read',
    responseEvent: 'clipboard:response',
    params: {},
  },
  {
    method: 'wallet.solana:connect',
    responseEvent: 'wallet.solana:connect.response',
    params: {},
  },
  {
    method: 'wallet.solana:sign.transaction',
    responseEvent: 'wallet.solana:sign.transaction.response',
    params: { transaction: 'b64' },
  },
  {
    method: 'wallet.solana:sign.message',
    responseEvent: 'wallet.solana:sign.message.response',
    params: { message: 'b58' },
  },
  {
    method: 'wallet.solana:sign.send',
    responseEvent: 'wallet.solana:sign.send.response',
    params: { transaction: 'b64' },
  },
];

const FIRE_AND_FORGET: readonly {
  method: MethodName;
  payload: Record<string, unknown>;
}[] = [
  { method: 'app:ready', payload: {} },
  { method: 'app:close', payload: {} },
  { method: 'host.back.button:toggle', payload: { visible: true } },
  { method: 'clipboard:write', payload: { text: 'x' } },
  { method: 'link:open', payload: { url: 'https://x' } },
  { method: 'haptic:impact', payload: { style: 'light' } },
  { method: 'haptic:notification', payload: { type: 'success' } },
  { method: 'haptic:selection', payload: {} },
  { method: 'wallet.solana:disconnect', payload: {} },
];

let mock: MockBridgeInstance | undefined;

beforeEach(() => {
  // Bun test runs with happy-dom/jsdom-style window if configured;
  // createMockBridge requires a real window object.
  const mockWindow = {
    addEventListener: () => {},
    removeEventListener: () => {},
    postMessage: () => {},
  };
  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  mock?.cleanup();
  mock = undefined;
  delete (globalThis as { window?: unknown }).window;
});

test('mock bridge - every request method has a response mapping', async () => {
  mock = createMockBridge();

  for (const { method, responseEvent, params } of REQUEST_METHODS) {
    // 250 ms is plenty for the mock's queueMicrotask response — if the
    // mapping is missing, this would hang for 30 s and the test would
    // time out at the Bun runner level. We use an explicit timeout to
    // make the failure mode clear.
    const response = await request(
      method,
      params as Omit<MethodPayload<typeof method>, 'reqId'>,
      responseEvent,
      { timeout: 250 },
    );
    expect(response).toBeDefined();
    expect(response.reqId).toBeDefined();
  }
});

test('mock bridge - every fire-and-forget method records a call', () => {
  mock = createMockBridge();

  for (const { method, payload } of FIRE_AND_FORGET) {
    send(method, payload as MethodPayload<typeof method>);
  }

  const calls = mock.getCalls();
  const recorded = new Set(calls.map((c) => c.method));

  for (const { method } of FIRE_AND_FORGET) {
    expect(recorded.has(method)).toBe(true);
  }
});

test('mock bridge - request methods and fire-and-forget sets are disjoint', () => {
  const reqSet = new Set(REQUEST_METHODS.map((r) => r.method));
  const ffSet = new Set(FIRE_AND_FORGET.map((f) => f.method));
  for (const m of reqSet) {
    expect(ffSet.has(m)).toBe(false);
  }
});
