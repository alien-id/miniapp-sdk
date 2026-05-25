import { afterEach, beforeEach, expect, test } from 'bun:test';
import type {
  FireAndForgetMethodName,
  MethodPayload,
  RequestMethodName,
} from '@alien-id/miniapps-contract';
import {
  FIRE_AND_FORGET_METHOD_NAMES,
  getResponseEvent,
  REQUEST_METHOD_NAMES,
} from '@alien-id/miniapps-contract';
import type { MockBridgeInstance } from '../src/mock';
import { createMockBridge } from '../src/mock';
import { request } from '../src/request';
import { send } from '../src/send';

/**
 * Minimum valid payloads for the request-response invocations exercised
 * below. Methods whose payload only contains `reqId` (`Empty`) default to
 * `{}` via the `Partial<...>` shape and don't need an entry here.
 *
 * The `satisfies` clause keeps the override map honest: every required
 * field on `MethodPayload<M> minus reqId` must be present, but adding
 * a *new* request method to the contract whose payload is empty just
 * works — no edit required here.
 */
const REQUEST_PAYLOAD_OVERRIDES = {
  'payment:request': {
    recipient: 'r',
    amount: '1',
    token: 'SOL',
    network: 'solana',
    invoice: 'inv',
  },
  'wallet.solana:sign.transaction': { transaction: 'b64' },
  'wallet.solana:sign.message': { message: 'b58' },
  'wallet.solana:sign.send': { transaction: 'b64' },
} as const satisfies {
  [M in RequestMethodName]?: Omit<MethodPayload<M>, 'reqId'>;
};

const FIRE_AND_FORGET_PAYLOADS = {
  'host.back.button:toggle': { visible: true },
  'clipboard:write': { text: 'x' },
  'link:open': { url: 'https://x' },
  'haptic:impact': { style: 'light' },
  'haptic:notification': { type: 'success' },
} as const satisfies {
  [M in FireAndForgetMethodName]?: MethodPayload<M>;
};

let mock: MockBridgeInstance | undefined;

beforeEach(() => {
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

test('mock bridge - every request method round-trips through its response event', async () => {
  mock = createMockBridge();

  for (const method of REQUEST_METHOD_NAMES) {
    const params =
      (
        REQUEST_PAYLOAD_OVERRIDES as Partial<
          Record<RequestMethodName, Record<string, unknown>>
        >
      )[method] ?? {};
    // 250 ms is plenty for the mock's microtask response — if a request
    // method is missing from the mock table the call would hang for
    // 30 s and the test would time out at the Bun runner level.
    const response = await request(
      method,
      params as Omit<MethodPayload<typeof method>, 'reqId'>,
      getResponseEvent(method),
      { timeout: 250 },
    );
    expect(response, `no response for ${method}`).toBeDefined();
    expect(response.reqId, `${method} response missing reqId`).toBeDefined();
  }
});

test('mock bridge - every fire-and-forget method is recorded as a call', () => {
  mock = createMockBridge();

  for (const method of FIRE_AND_FORGET_METHOD_NAMES) {
    const payload =
      (
        FIRE_AND_FORGET_PAYLOADS as Partial<
          Record<FireAndForgetMethodName, Record<string, unknown>>
        >
      )[method] ?? {};
    send(method, payload as MethodPayload<typeof method>);
  }

  const recorded = new Set(mock.getCalls().map((c) => c.method));
  for (const method of FIRE_AND_FORGET_METHOD_NAMES) {
    expect(recorded.has(method), `${method} was not recorded`).toBe(true);
  }
});

test('mock bridge - request and fire-and-forget partitions are disjoint', () => {
  const requestSet = new Set<string>(REQUEST_METHOD_NAMES);
  for (const method of FIRE_AND_FORGET_METHOD_NAMES) {
    expect(requestSet.has(method)).toBe(false);
  }
});
