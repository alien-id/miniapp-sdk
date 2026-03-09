import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { on } from '../src/events';
import type { MockBridgeInstance } from '../src/mock';
import { createMockBridge } from '../src/mock';
import { request } from '../src/request';
import { send } from '../src/send';

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
  delete (globalThis as { window?: unknown }).window;
});

describe('createMockBridge', () => {
  let mock: MockBridgeInstance;

  afterEach(() => {
    mock?.cleanup();
  });

  test('sets window.__miniAppsBridge__', () => {
    mock = createMockBridge();
    expect(window.__miniAppsBridge__).toBeDefined();
    expect(typeof window.__miniAppsBridge__?.postMessage).toBe('function');
  });

  test('sets launch param globals with defaults', () => {
    mock = createMockBridge();
    expect(window.__ALIEN_AUTH_TOKEN__).toBe('mock-auth-token');
    expect(window.__ALIEN_CONTRACT_VERSION__).toBe('1.0.0');
    expect(window.__ALIEN_PLATFORM__).toBe('ios');
    expect(window.__ALIEN_DISPLAY_MODE__).toBe('standard');
  });

  test('sets custom launch params', () => {
    mock = createMockBridge({
      launchParams: {
        authToken: 'custom-token',
        platform: 'android',
      },
    });
    expect(window.__ALIEN_AUTH_TOKEN__).toBe('custom-token');
    expect(window.__ALIEN_PLATFORM__).toBe('android');
    expect(window.__ALIEN_CONTRACT_VERSION__).toBe('1.0.0');
  });

  test('auto-responds to payment:request with default payload', async () => {
    mock = createMockBridge();

    const response = await request(
      'payment:request',
      {
        recipient: 'wallet-123',
        amount: '100',
        token: 'SOL',
        network: 'solana',
        invoice: 'inv-1',
      },
      'payment:response',
      { reqId: 'req-pay-1', timeout: 1000 },
    );

    expect(response.status).toBe('paid');
    expect(response.txHash).toBe('mock-tx-req-pay-1');
    expect(response.reqId).toBe('req-pay-1');
  });

  test('auto-responds to clipboard:read', async () => {
    mock = createMockBridge();

    const response = await request('clipboard:read', {}, 'clipboard:response', {
      reqId: 'req-clip-1',
      timeout: 1000,
    });

    expect(response.text).toBe('mock clipboard text');
    expect(response.reqId).toBe('req-clip-1');
  });

  test('auto-responds to wallet.solana:connect', async () => {
    mock = createMockBridge();

    const response = await request(
      'wallet.solana:connect',
      {},
      'wallet.solana:connect.response',
      { reqId: 'req-conn-1', timeout: 1000 },
    );

    expect(response.publicKey).toBe('11111111111111111111111111111111');
    expect(response.reqId).toBe('req-conn-1');
  });

  test('fire-and-forget methods do not produce responses', () => {
    mock = createMockBridge();

    send('app:ready', {});
    send('haptic:impact', { style: 'medium' });

    const calls = mock.getCalls();
    expect(calls).toHaveLength(2);
    expect(calls[0]?.method).toBe('app:ready');
    expect(calls[1]?.method).toBe('haptic:impact');
  });

  test('custom handler overrides default response', async () => {
    mock = createMockBridge({
      handlers: {
        'payment:request': (payload) => ({
          status: 'cancelled',
          reqId: payload.reqId,
        }),
      },
    });

    const response = await request(
      'payment:request',
      {
        recipient: 'wallet-123',
        amount: '100',
        token: 'SOL',
        network: 'solana',
        invoice: 'inv-1',
      },
      'payment:response',
      { reqId: 'req-custom-1', timeout: 1000 },
    );

    expect(response.status).toBe('cancelled');
    expect(response.reqId).toBe('req-custom-1');
  });

  test('false handler suppresses response (causes timeout)', async () => {
    mock = createMockBridge({
      handlers: {
        'clipboard:read': false,
      },
    });

    const promise = request('clipboard:read', {}, 'clipboard:response', {
      reqId: 'req-no-resp',
      timeout: 50,
    });

    await expect(promise).rejects.toThrow('Request timeout');
  }, 200);

  test('delay option delays responses', async () => {
    mock = createMockBridge({ delay: 50 });

    const start = Date.now();
    await request('clipboard:read', {}, 'clipboard:response', {
      reqId: 'req-delay',
      timeout: 1000,
    });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(40);
  }, 2000);

  test('emitEvent dispatches events receivable by on()', async () => {
    mock = createMockBridge();

    const received = new Promise<Record<string, unknown>>((resolve) => {
      on('host.back.button:clicked', (payload) => {
        resolve(payload as unknown as Record<string, unknown>);
      });
    });

    mock.emitEvent('host.back.button:clicked', {});

    const payload = await received;
    expect(payload).toBeDefined();
  }, 1000);

  test('getCalls records all method calls', () => {
    mock = createMockBridge();

    send('app:ready', {});
    send('haptic:impact', { style: 'light' });

    const calls = mock.getCalls();
    expect(calls).toHaveLength(2);
    expect(calls[0]?.method).toBe('app:ready');
    expect(calls[0]?.timestamp).toBeGreaterThan(0);
    expect(calls[1]?.method).toBe('haptic:impact');
    expect(calls[1]?.payload).toEqual({ style: 'light' });
  });

  test('resetCalls clears call history', () => {
    mock = createMockBridge();

    send('app:ready', {});
    expect(mock.getCalls()).toHaveLength(1);

    mock.resetCalls();
    expect(mock.getCalls()).toHaveLength(0);
  });

  test('getCalls returns a copy (not mutable reference)', () => {
    mock = createMockBridge();

    send('app:ready', {});
    const calls = mock.getCalls();
    calls.push({ method: 'fake', payload: {}, timestamp: 0 });

    expect(mock.getCalls()).toHaveLength(1);
  });

  test('cleanup removes bridge and launch params', () => {
    mock = createMockBridge();
    expect(window.__miniAppsBridge__).toBeDefined();
    expect(window.__ALIEN_AUTH_TOKEN__).toBeDefined();

    mock.cleanup();
    expect(window.__miniAppsBridge__).toBeUndefined();
    expect(window.__ALIEN_AUTH_TOKEN__).toBeUndefined();
  });

  test('cleanup cancels pending delayed responses', async () => {
    mock = createMockBridge({ delay: 100 });

    let received = false;
    on('clipboard:response', () => {
      received = true;
    });

    send('clipboard:read', { reqId: 'req-pending' } as never);
    mock.cleanup();

    // Wait longer than the delay to confirm it was cancelled
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(received).toBe(false);
  }, 500);

  test('warns if bridge already exists', () => {
    window.__miniAppsBridge__ = { postMessage: () => {} };

    mock = createMockBridge();
    expect(window.__miniAppsBridge__).toBeDefined();
  });
});
