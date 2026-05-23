import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
} from '../src/errors';
import { emit, on } from '../src/events';
import { clearMockLaunchParams } from '../src/launch-params';
import { request } from '../src/request';

// Mock window for tests - only mock what's actually needed
let mockWindow: {
  addEventListener: (
    type: string,
    handler: (event: MessageEvent) => void,
  ) => void;
  removeEventListener: (
    type: string,
    handler: (event: MessageEvent) => void,
  ) => void;
  __miniAppsBridge__?: {
    postMessage: (data: string) => void;
  };
};

beforeEach(() => {
  const bridgePostMessageFn = () => {
    // No-op for these tests
  };

  mockWindow = {
    addEventListener: () => {
      // No-op for these tests
    },
    removeEventListener: () => {
      // No-op for these tests
    },
    __miniAppsBridge__: {
      postMessage: bridgePostMessageFn,
    },
  };

  // Set up global window mock
  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  clearMockLaunchParams();
  delete (globalThis as { window?: unknown }).window;
});

test('request - should wait for response with matching reqId', async () => {
  const customReqId = 'test-req-123';
  const promise = request(
    'payment:request',
    {
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    },
    'payment:response',
    { reqId: customReqId },
  );

  setTimeout(() => {
    emit('payment:response', {
      status: 'paid' as const,
      txHash: 'tx-hash',
      reqId: customReqId,
    });
  }, 10);

  const result = await promise;
  expect(result).toBeDefined();
  expect(result.reqId).toBe(customReqId);
}, 100);

test('request - should support custom reqId', async () => {
  const customReqId = 'custom-123';
  const promise = request(
    'payment:request',
    {
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    },
    'payment:response',
    { reqId: customReqId },
  );

  setTimeout(() => {
    emit('payment:response', {
      status: 'paid' as const,
      txHash: 'tx-hash',
      reqId: customReqId,
    });
  }, 10);

  const result = await promise;
  expect(result.reqId).toBe(customReqId);
}, 100);

test('request - should timeout if no response', async () => {
  const promise = request(
    'payment:request',
    {
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    },
    'payment:response',
    { timeout: 50 },
  );

  expect(promise).rejects.toThrow('Request timeout');
}, 100);

test('request - should reject with BridgeUnavailableError when bridge missing', async () => {
  delete mockWindow.__miniAppsBridge__;
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  await expect(
    request(
      'payment:request',
      {
        recipient: '',
        amount: '',
        token: '',
        network: '',
        invoice: '',
      },
      'payment:response',
      { timeout: 50 },
    ),
  ).rejects.toBeInstanceOf(BridgeUnavailableError);
});

test('request - should reject with BridgeMethodUnsupportedError when host contract version is below method min', async () => {
  (mockWindow as Record<string, unknown>).__ALIEN_AUTH_TOKEN__ = 'token';
  (mockWindow as Record<string, unknown>).__ALIEN_CONTRACT_VERSION__ = '0.0.9';
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  let thrown: unknown;
  try {
    await request(
      'payment:request',
      {
        recipient: '',
        amount: '',
        token: '',
        network: '',
        invoice: '',
      },
      'payment:response',
      { timeout: 50 },
    );
  } catch (e) {
    thrown = e;
  }
  expect(thrown).toBeInstanceOf(BridgeMethodUnsupportedError);
  if (thrown instanceof BridgeMethodUnsupportedError) {
    expect(thrown.method).toBe('payment:request');
    expect(thrown.contractVersion).toBe('0.0.9');
    expect(thrown.minVersion).toBe('0.1.1');
  }
});

test('request - late response after timeout does not crash and channel stays usable', async () => {
  // Regression: a response that arrives AFTER timeout should not throw
  // an unhandled error, and the internal listener cleanup should not
  // poison the event channel for subsequent subscribers.
  const reqId = 'late-response-test';
  const timeoutMs = 20;
  const lateEmitDelayMs = 50;

  let timeoutError: unknown;
  try {
    await request(
      'payment:request',
      {
        recipient: 'wallet-123',
        amount: '100',
        token: 'SOL',
        network: 'solana',
        invoice: 'inv-123',
      },
      'payment:response',
      { reqId, timeout: timeoutMs },
    );
  } catch (e) {
    timeoutError = e;
  }
  expect(timeoutError).toBeInstanceOf(BridgeTimeoutError);

  // Subscribe BEFORE the late response fires; this listener proves that
  // (a) the channel is not poisoned, and (b) late events propagate normally.
  const received: Array<{ reqId: string }> = [];
  const unsubscribe = on('payment:response', (payload) => {
    received.push({ reqId: payload.reqId });
  });

  // Fire the late response that the request would have matched if alive.
  await new Promise<void>((resolve) =>
    setTimeout(async () => {
      // This must NOT throw or trigger an unhandled rejection.
      await emit('payment:response', {
        status: 'paid' as const,
        txHash: 'tx-hash',
        reqId,
      });
      resolve();
    }, lateEmitDelayMs - timeoutMs),
  );

  // Fresh listener received the late event — channel not poisoned.
  expect(received).toEqual([{ reqId }]);

  // Emitting another event still reaches the listener — channel still alive.
  await emit('payment:response', {
    status: 'paid' as const,
    txHash: 'tx-hash',
    reqId: 'follow-up',
  });
  expect(received).toEqual([{ reqId }, { reqId: 'follow-up' }]);

  unsubscribe();
}, 200);

test('request - two concurrent requests for same method correlate by reqId', async () => {
  // Regression: with two in-flight requests on the same response event,
  // each promise must resolve with its OWN reqId's payload — never the
  // other's. Lock the correlation invariant.
  const reqIdA = 'concurrent-a';
  const reqIdB = 'concurrent-b';

  const promiseA = request(
    'payment:request',
    {
      recipient: 'wallet-A',
      amount: '10',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-A',
    },
    'payment:response',
    { reqId: reqIdA },
  );

  const promiseB = request(
    'payment:request',
    {
      recipient: 'wallet-B',
      amount: '20',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-B',
    },
    'payment:response',
    { reqId: reqIdB },
  );

  // Respond to B first, then A — out-of-order delivery must still correlate.
  setTimeout(() => {
    emit('payment:response', {
      status: 'paid' as const,
      txHash: 'tx-B',
      reqId: reqIdB,
    });
  }, 10);

  setTimeout(() => {
    emit('payment:response', {
      status: 'paid' as const,
      txHash: 'tx-A',
      reqId: reqIdA,
    });
  }, 30);

  const [resultA, resultB] = await Promise.all([promiseA, promiseB]);
  expect(resultA.reqId).toBe(reqIdA);
  if (resultA.status === 'paid') expect(resultA.txHash).toBe('tx-A');
  expect(resultB.reqId).toBe(reqIdB);
  if (resultB.status === 'paid') expect(resultB.txHash).toBe('tx-B');
}, 200);

test('request - posts a typed bridge message with reqId merged into the payload', async () => {
  // Positive transport invariant: the actual `postMessage` call must shape
  // exactly as `{ type: 'method', name, payload: { ...params, reqId } }`.
  // Without this, the bridge could silently change its wire format and the
  // existing tests would still pass because they only check the response side.
  const sentMessages: Array<string> = [];
  mockWindow.__miniAppsBridge__ = {
    postMessage: (data: string) => {
      sentMessages.push(data);
    },
  };
  (globalThis as { window: typeof mockWindow }).window = mockWindow;

  const reqId = 'transport-invariant-req';
  const params = {
    recipient: 'wallet-123',
    amount: '100',
    token: 'SOL',
    network: 'solana',
    invoice: 'inv-123',
  };

  // Fire the request; we don't await it (we only need to observe the send).
  const promise = request('payment:request', params, 'payment:response', {
    reqId,
    timeout: 50,
  });
  promise.catch(() => {
    // Expected: this will time out — we're only checking transport here.
  });

  expect(sentMessages.length).toBe(1);
  expect(JSON.parse(sentMessages[0] as string)).toEqual({
    type: 'method',
    name: 'payment:request',
    payload: { ...params, reqId },
  });

  // Let the timeout fire so the listener cleans up and doesn't leak into
  // the next test.
  try {
    await promise;
  } catch {
    // Ignored.
  }
}, 200);

test('request - should ignore responses with different reqId', async () => {
  const promise = request(
    'payment:request',
    {
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    },
    'payment:response',
    { reqId: 'req-1' },
  );

  setTimeout(() => {
    emit('payment:response', {
      status: 'paid' as const,
      txHash: 'tx-hash',
      reqId: 'req-2',
    });
  }, 10);

  setTimeout(() => {
    emit('payment:response', {
      status: 'paid' as const,
      txHash: 'tx-hash',
      reqId: 'req-1',
    });
  }, 50);

  const result = await promise;
  expect(result.reqId).toBe('req-1');
}, 100);
