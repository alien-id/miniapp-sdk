import type {
  EventName,
  EventPayload,
  LaunchParams,
  MethodName,
} from '@alien_org/contract';
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

const METHOD_RESPONSE_MAP: Record<
  string,
  {
    event: EventName;
    defaultResponse: (reqId: string) => Record<string, unknown>;
  }
> = {
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
};

const FIRE_AND_FORGET_METHODS = new Set<string>([
  'app:ready',
  'app:close',
  'host.back.button:toggle',
  'clipboard:write',
  'link:open',
  'haptic:impact',
  'haptic:notification',
  'haptic:selection',
  'wallet.solana:disconnect',
]);

const DEFAULT_LAUNCH_PARAMS: Partial<LaunchParams> = {
  authToken: 'mock-auth-token',
  contractVersion: '1.0.0',
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

  // Inject mock bridge
  window.__miniAppsBridge__ = {
    postMessage(data: string) {
      let message: Message;
      try {
        message = JSON.parse(data);
      } catch {
        return;
      }

      // Only handle method calls from the miniapp
      if (message.type !== 'method') return;

      const { name, payload } = message;
      const payloadObj = (payload ?? {}) as Record<string, unknown>;

      // Record the call
      calls.push({
        method: name,
        payload: payloadObj,
        timestamp: Date.now(),
      });

      // Check if fire-and-forget
      if (FIRE_AND_FORGET_METHODS.has(name)) {
        console.log(
          `[AlienMock] --> ${name} ${JSON.stringify(payloadObj)}  (fire-and-forget)`,
        );
        return;
      }

      console.log(`[AlienMock] --> ${name} ${JSON.stringify(payloadObj)}`);

      // Check for response mapping
      const mapping = METHOD_RESPONSE_MAP[name];
      if (!mapping) return;

      // Check custom handler
      const customHandler = handlers[name as MethodName];
      if (customHandler === false) {
        // Suppress response
        return;
      }

      const reqId = (payloadObj.reqId as string) ?? '';

      let responsePayload: Record<string, unknown>;
      if (typeof customHandler === 'function') {
        responsePayload = customHandler(payloadObj);
      } else {
        responsePayload = mapping.defaultResponse(reqId);
      }

      const dispatchResponse = () => {
        console.log(
          `[AlienMock] <-- ${mapping.event} ${JSON.stringify(responsePayload)}`,
        );
        void emit(
          mapping.event,
          responsePayload as EventPayload<typeof mapping.event>,
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
