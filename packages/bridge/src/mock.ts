import type {
  EventName,
  EventPayload,
  LaunchParams,
  MethodName,
  MethodPayload,
  MethodResponseEvent,
  RequestMethodName,
} from '@alien-id/miniapps-contract';
import { getResponseEvent, LATEST_VERSION } from '@alien-id/miniapps-contract';
import { emit } from './events';
import { clearMockLaunchParams, mockLaunchParamsForDev } from './launch-params';
import type { Message } from './transport';

type MockMethodHandler = (
  payload: Record<string, unknown>,
) => Record<string, unknown>;

export interface MockBridgeOptions {
  launchParams?: Partial<LaunchParams>;
  handlers?: Partial<Record<MethodName, MockMethodHandler | false>>;
  delay?: number;
}

export interface MethodCall {
  method: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface MockBridgeInstance {
  cleanup: () => void;
  emitEvent: <E extends EventName>(name: E, payload: EventPayload<E>) => void;
  getCalls: () => MethodCall[];
  resetCalls: () => void;
}

/**
 * Mock responder per request method.
 *
 * Receives the request payload, returns the response payload that the
 * mock dispatches on the matching response event. Both sides are typed
 * against the contract, so a payload-shape change there propagates here
 * as a compile error.
 */
type MockResponder<M extends RequestMethodName> = (
  payload: MethodPayload<M>,
) => EventPayload<MethodResponseEvent<M>>;

/**
 * Default mock response for every request-response method.
 *
 * Typed as a mapped type over {@link RequestMethodName}, so adding a
 * new request method to the contract fails this map's `satisfies`
 * check until the new responder is wired in — no separate
 * fire-and-forget list to keep in sync, no parity test required.
 *
 * The runtime membership of this object also classifies methods: any
 * method *not* in it is fire-and-forget.
 */
const MOCK_RESPONSES: {
  [M in RequestMethodName]: MockResponder<M>;
} = {
  'payment:request': (p) => ({
    status: 'paid',
    txHash: `mock-tx-${p.reqId}`,
    reqId: p.reqId,
  }),
  'clipboard:read': (p) => ({
    text: 'mock clipboard text',
    reqId: p.reqId,
  }),
  'wallet.solana:connect': (p) => ({
    publicKey: '11111111111111111111111111111111',
    reqId: p.reqId,
  }),
  'wallet.solana:sign.transaction': (p) => ({
    signedTransaction: 'mock-signed-tx',
    reqId: p.reqId,
  }),
  'wallet.solana:sign.message': (p) => ({
    signature: 'mock-sig',
    publicKey: '11111111111111111111111111111111',
    reqId: p.reqId,
  }),
  'wallet.solana:sign.send': (p) => ({
    signature: `mock-sig-${p.reqId}`,
    reqId: p.reqId,
  }),
  'notifications:permission.request': (p) => ({
    status: 'granted',
    reqId: p.reqId,
  }),
};

function isRequestMethod(name: string): name is RequestMethodName {
  return Object.hasOwn(MOCK_RESPONSES, name);
}

const DEFAULT_LAUNCH_PARAMS: Partial<LaunchParams> = {
  authToken: 'mock-auth-token',
  contractVersion: LATEST_VERSION,
  platform: 'ios',
  displayMode: 'standard',
};

export function createMockBridge(
  options: MockBridgeOptions = {},
): MockBridgeInstance {
  if (typeof window === 'undefined') {
    throw new Error('createMockBridge requires a browser environment (window)');
  }

  if (window.__miniAppsBridge__) {
    console.warn(
      '[AlienMock] Bridge already exists on window. The mock bridge will override it.',
    );
  }

  const calls: MethodCall[] = [];
  const pendingTimeouts: ReturnType<typeof setTimeout>[] = [];
  const delay = options.delay ?? 0;
  const handlers = options.handlers ?? {};

  // Inject launch params
  const launchParams = { ...DEFAULT_LAUNCH_PARAMS, ...options.launchParams };
  mockLaunchParamsForDev(launchParams);

  window.__miniAppsBridge__ = {
    postMessage(data: string) {
      let message: Message;
      try {
        message = JSON.parse(data);
      } catch {
        return;
      }

      if (message.type !== 'method') return;

      const { name, payload } = message;
      const payloadObj = (payload ?? {}) as Record<string, unknown>;

      calls.push({
        method: name,
        payload: payloadObj,
        timestamp: Date.now(),
      });

      if (!isRequestMethod(name)) {
        console.log(
          `[AlienMock] --> ${name} ${JSON.stringify(payloadObj)}  (fire-and-forget)`,
        );
        return;
      }

      console.log(`[AlienMock] --> ${name} ${JSON.stringify(payloadObj)}`);

      const customHandler = handlers[name];
      if (customHandler === false) return;

      // Each MOCK_RESPONSES entry is typed against its specific request
      // method, but a runtime-dispatched call has the union type, which
      // TypeScript widens to a contravariant impossible parameter. Cast
      // through `unknown` so the dispatch line stays plain at runtime
      // without leaking weak typing back into the table itself.
      const responder = MOCK_RESPONSES[name] as unknown as (
        p: Record<string, unknown>,
      ) => Record<string, unknown>;
      const responsePayload =
        typeof customHandler === 'function'
          ? customHandler(payloadObj)
          : responder(payloadObj);
      const responseEvent = getResponseEvent(name);

      const dispatchResponse = () => {
        console.log(
          `[AlienMock] <-- ${responseEvent} ${JSON.stringify(responsePayload)}`,
        );
        void emit(
          responseEvent,
          responsePayload as EventPayload<typeof responseEvent>,
        );
      };

      if (delay > 0) {
        pendingTimeouts.push(setTimeout(dispatchResponse, delay));
      } else {
        queueMicrotask(dispatchResponse);
      }
    },
  };

  console.log('[AlienMock] bridge created');

  return {
    cleanup() {
      for (const id of pendingTimeouts) {
        clearTimeout(id);
      }
      pendingTimeouts.length = 0;
      delete window.__miniAppsBridge__;
      clearMockLaunchParams();
      console.log('[AlienMock] bridge cleaned up');
    },

    emitEvent<E extends EventName>(name: E, payload: EventPayload<E>) {
      void emit(name, payload as Parameters<typeof emit<E>>[1]);
    },

    getCalls() {
      return [...calls];
    },

    resetCalls() {
      calls.length = 0;
    },
  };
}
