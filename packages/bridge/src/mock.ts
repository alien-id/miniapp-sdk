import type {
  EventName,
  EventPayload,
  LaunchParams,
  MethodName,
} from '@alien-id/miniapps-contract';
import { LATEST_VERSION } from '@alien-id/miniapps-contract';
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

interface MockResponse {
  event: EventName;
  defaultResponse: (reqId: string) => Record<string, unknown>;
}

// Mock-only mapping from request methods to their response event and a
// default response payload. The contract no longer enforces this binding
// — every test or app that needs a richer simulation passes a custom
// handler via `MockBridgeOptions.handlers`. Methods absent from this
// table are treated as fire-and-forget by the mock.
const MOCK_RESPONSES: Partial<Record<MethodName, MockResponse>> = {
  'payment:request': {
    event: 'payment:response',
    defaultResponse: (reqId) => ({
      status: 'paid',
      txHash: `mock-tx-${reqId}`,
      reqId,
    }),
  },
  'clipboard:read': {
    event: 'clipboard:response',
    defaultResponse: (reqId) => ({
      text: 'mock clipboard text',
      reqId,
    }),
  },
  'wallet.solana:connect': {
    event: 'wallet.solana:connect.response',
    defaultResponse: (reqId) => ({
      publicKey: '11111111111111111111111111111111',
      reqId,
    }),
  },
  'wallet.solana:sign.transaction': {
    event: 'wallet.solana:sign.transaction.response',
    defaultResponse: (reqId) => ({
      signedTransaction: 'mock-signed-tx',
      reqId,
    }),
  },
  'wallet.solana:sign.message': {
    event: 'wallet.solana:sign.message.response',
    defaultResponse: (reqId) => ({
      signature: 'mock-sig',
      publicKey: '11111111111111111111111111111111',
      reqId,
    }),
  },
  'wallet.solana:sign.send': {
    event: 'wallet.solana:sign.send.response',
    defaultResponse: (reqId) => ({
      signature: `mock-sig-${reqId}`,
      reqId,
    }),
  },
  'notifications:permission.request': {
    event: 'notifications:permission.response',
    defaultResponse: (reqId) => ({
      status: 'granted',
      reqId,
    }),
  },
};

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

      const mapping = MOCK_RESPONSES[name];
      if (!mapping) {
        console.log(
          `[AlienMock] --> ${name} ${JSON.stringify(payloadObj)}  (fire-and-forget)`,
        );
        return;
      }

      console.log(`[AlienMock] --> ${name} ${JSON.stringify(payloadObj)}`);

      const customHandler = handlers[name];
      if (customHandler === false) return;

      const reqId = (payloadObj.reqId as string) ?? '';
      const responsePayload =
        typeof customHandler === 'function'
          ? customHandler(payloadObj)
          : mapping.defaultResponse(reqId);
      const { event: responseEvent } = mapping;

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
