import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
  BridgeMethodUnsupportedError,
  BridgeUnavailableError,
  emit,
} from '@alien-id/miniapps-bridge';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePayment } from '../src/hooks/usePayment';
import {
  BridgeTestWrapper,
  clearBridgeEnvironment,
  setBridgeEnvironment,
} from './test-utils';

function setCapturingBridge(): Array<{
  type: string;
  name: string;
  payload: { reqId?: string };
}> {
  const sent: Array<{
    type: string;
    name: string;
    payload: { reqId?: string };
  }> = [];
  (
    window as unknown as {
      __miniAppsBridge__: { postMessage: (data: string) => void };
    }
  ).__miniAppsBridge__ = {
    postMessage: (data: string) => {
      sent.push(JSON.parse(data));
    },
  };
  return sent;
}

const defaultParams = {
  recipient: 'wallet-123',
  amount: '100',
  token: 'SOL',
  network: 'solana',
  invoice: 'inv-1',
};

beforeEach(() => {
  clearBridgeEnvironment();
});

afterEach(() => {
  clearBridgeEnvironment();
});

test('usePayment - callable is true when host supports payment:request', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const { result } = renderHook(() => usePayment(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(true);
  // `error` defaults to `null` (not `undefined`) for consistency across
  // call hooks.
  expect(result.current.error).toBeNull();
});

test('usePayment - pay() returns BridgeUnavailableError when bridge is missing', async () => {
  setBridgeEnvironment({ bridge: false });
  const { result } = renderHook(() => usePayment(), {
    wrapper: BridgeTestWrapper,
  });

  let res: Awaited<ReturnType<typeof result.current.pay>> | undefined;
  await act(async () => {
    res = await result.current.pay(defaultParams);
  });

  expect(res?.status).toBe('failed');
  expect(res?.errorCode).toBe('unknown');
  expect(res?.error).toBeInstanceOf(BridgeUnavailableError);
  expect(result.current.isFailed).toBe(true);
  expect(result.current.error).toBeInstanceOf(BridgeUnavailableError);
});

test('usePayment - pay() returns BridgeMethodUnsupportedError when host Contract Version is below 0.1.1', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '0.1.0' });
  const { result } = renderHook(() => usePayment(), {
    wrapper: BridgeTestWrapper,
  });

  let res: Awaited<ReturnType<typeof result.current.pay>> | undefined;
  await act(async () => {
    res = await result.current.pay(defaultParams);
  });

  expect(res?.error).toBeInstanceOf(BridgeMethodUnsupportedError);
  expect(result.current.error).toBeInstanceOf(BridgeMethodUnsupportedError);
});

test('usePayment - pay() resolves with paid + txHash when host responds with paid', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  let paidCalls = 0;
  const { result } = renderHook(
    () =>
      usePayment({
        onPaid: () => {
          paidCalls += 1;
        },
      }),
    { wrapper: BridgeTestWrapper },
  );

  let payPromise!: Promise<Awaited<ReturnType<typeof result.current.pay>>>;
  act(() => {
    payPromise = result.current.pay(defaultParams);
  });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(true);
  });

  const outgoing = sent.find(
    (m) => m.type === 'method' && m.name === 'payment:request',
  );
  const reqId = outgoing?.payload?.reqId as string;

  await act(async () => {
    await emit('payment:response', {
      status: 'paid',
      txHash: 'tx-hash-1',
      reqId,
    });
  });

  const res = await payPromise;
  expect(res.status).toBe('paid');
  expect(res.txHash).toBe('tx-hash-1');
  expect(result.current.isPaid).toBe(true);
  expect(paidCalls).toBe(1);
});

test('usePayment - pay() exposes errorCode without bridge error when host returns failed', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  let failedCalls: string[] = [];
  const { result } = renderHook(
    () =>
      usePayment({
        onFailed: (code) => {
          failedCalls.push(code);
        },
      }),
    { wrapper: BridgeTestWrapper },
  );

  let payPromise!: Promise<Awaited<ReturnType<typeof result.current.pay>>>;
  act(() => {
    payPromise = result.current.pay(defaultParams);
  });
  await waitFor(() => {
    expect(result.current.isLoading).toBe(true);
  });
  const outgoing = sent.find(
    (m) => m.type === 'method' && m.name === 'payment:request',
  );
  const reqId = outgoing?.payload?.reqId as string;

  await act(async () => {
    await emit('payment:response', {
      status: 'failed',
      errorCode: 'insufficient_balance',
      reqId,
    });
  });

  const res = await payPromise;
  expect(res.status).toBe('failed');
  expect(res.errorCode).toBe('insufficient_balance');
  expect(res.error).toBeUndefined();
  expect(failedCalls).toEqual(['insufficient_balance']);
});

test('usePayment - rejects empty recipient with a synchronous failure', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const { result } = renderHook(() => usePayment(), {
    wrapper: BridgeTestWrapper,
  });
  let res: Awaited<ReturnType<typeof result.current.pay>> | undefined;
  await act(async () => {
    res = await result.current.pay({ ...defaultParams, recipient: '' });
  });
  expect(res?.status).toBe('failed');
  expect(res?.errorCode).toBe('unknown');
  expect(res?.error).toBeInstanceOf(Error);
});

test('usePayment - reset() returns status to idle', async () => {
  setBridgeEnvironment({ bridge: false });
  const { result } = renderHook(() => usePayment(), {
    wrapper: BridgeTestWrapper,
  });
  await act(async () => {
    await result.current.pay(defaultParams);
  });
  expect(result.current.isFailed).toBe(true);
  act(() => result.current.reset());
  expect(result.current.status).toBe('idle');
});
