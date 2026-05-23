import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
  BridgeBusyError,
  BridgeUnavailableError,
  emit,
} from '@alien-id/miniapps-bridge';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCallable } from '../src/hooks/useCallable';
import { useMethod } from '../src/hooks/useMethod';
import {
  BridgeTestWrapper,
  clearBridgeEnvironment,
  ControllableAlienProvider,
  setBridgeEnvironment,
} from './test-utils';

beforeEach(() => {
  clearBridgeEnvironment();
});

afterEach(() => {
  clearBridgeEnvironment();
});

test('useMethod - exposes `callable: boolean` shortcut field in return shape', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const { result } = renderHook(
    () => useMethod('payment:request', 'payment:response'),
    { wrapper: BridgeTestWrapper },
  );

  expect(typeof result.current.callable).toBe('boolean');
  expect(result.current.callable).toBe(true);
  expect(result.current.data).toBeUndefined();
  // `error` is explicitly `null` (not `undefined`) so consumers can read
  // "no error" without ambiguity between an absent property and a cleared
  // one.
  expect(result.current.error).toBeNull();
  expect(result.current.isLoading).toBe(false);
});

test('useMethod - execute() writes BridgeUnavailableError to error state when bridge is absent (no throw)', async () => {
  setBridgeEnvironment({ bridge: false });
  const { result } = renderHook(
    () => useMethod('payment:request', 'payment:response'),
    { wrapper: BridgeTestWrapper },
  );

  expect(result.current.callable).toBe(false);

  let resolved: { data: unknown; error: Error | null } | undefined;
  await act(async () => {
    resolved = await result.current.execute({
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    });
  });

  expect(resolved?.data).toBeUndefined();
  expect(resolved?.error).toBeInstanceOf(BridgeUnavailableError);
  expect(result.current.error).toBeInstanceOf(BridgeUnavailableError);
  expect(result.current.isLoading).toBe(false);
});

test('useMethod - successful round-trip writes response to data state', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const { result } = renderHook(
    () => useMethod('payment:request', 'payment:response'),
    { wrapper: BridgeTestWrapper },
  );

  expect(result.current.callable).toBe(true);

  // Use an explicit reqId so the test can emit a correlated response.
  const reqId = 'use-method-test-req';
  let executePromise!: Promise<{ data: unknown; error: Error | null }>;
  act(() => {
    executePromise = result.current.execute(
      {
        recipient: 'wallet-123',
        amount: '100',
        token: 'SOL',
        network: 'solana',
        invoice: 'inv-123',
      },
      { reqId },
    );
  });

  // Wait for isLoading to flip so we know the listener is registered.
  await waitFor(() => {
    expect(result.current.isLoading).toBe(true);
  });

  // Simulate the host returning a paid response.
  await act(async () => {
    await emit('payment:response', {
      status: 'paid',
      txHash: 'tx-hash',
      reqId,
    });
  });

  const resolved = await executePromise;
  expect(resolved.error).toBeNull();
  expect(resolved.data).toMatchObject({ status: 'paid', txHash: 'tx-hash' });
  expect(result.current.data).toMatchObject({
    status: 'paid',
    txHash: 'tx-hash',
  });
  expect(result.current.error).toBeNull();
  expect(result.current.isLoading).toBe(false);
});

test('useMethod - requestOptions.version override succeeds even when context Contract Version is outdated', async () => {
  // Regression: context says "host-outdated" for payment:request (needs
  // 0.1.1, host advertises 0.0.9). Caller bypasses with the override.
  // Pre-fix: useMethod refused on the stale context snapshot. Post-fix:
  // execute() re-evaluates Callability against the override and proceeds.
  setBridgeEnvironment({ bridge: true, contractVersion: '0.0.9' });
  const { result } = renderHook(
    () => useMethod('payment:request', 'payment:response'),
    { wrapper: BridgeTestWrapper },
  );

  // Context-derived callable still reflects the outdated host.
  expect(result.current.callable).toBe(false);

  const reqId = 'use-method-override-test-req';
  let executePromise!: Promise<{ data: unknown; error: Error | null }>;
  act(() => {
    executePromise = result.current.execute(
      {
        recipient: 'wallet-123',
        amount: '100',
        token: 'SOL',
        network: 'solana',
        invoice: 'inv-123',
      },
      { reqId, version: '1.0.0' },
    );
  });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(true);
  });

  await act(async () => {
    await emit('payment:response', {
      status: 'paid',
      txHash: 'override-tx',
      reqId,
    });
  });

  const resolved = await executePromise;
  expect(resolved.error).toBeNull();
  expect(resolved.data).toMatchObject({ status: 'paid', txHash: 'override-tx' });
});

test('useMethod - overlapping execute() returns BridgeBusyError without disturbing the in-flight call', async () => {
  // Regression: pre-fix the busy path resolved to
  // `{ data: undefined, error: undefined }`, indistinguishable from a
  // successful response that carries no payload. The fix returns a typed
  // BridgeBusyError so callers can branch on `instanceof`.
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const { result } = renderHook(
    () => useMethod('payment:request', 'payment:response'),
    { wrapper: BridgeTestWrapper },
  );

  const firstReqId = 'busy-test-first';
  let firstPromise!: Promise<{ data: unknown; error: Error | null }>;
  act(() => {
    firstPromise = result.current.execute(
      {
        recipient: 'wallet-123',
        amount: '100',
        token: 'SOL',
        network: 'solana',
        invoice: 'inv-1',
      },
      { reqId: firstReqId },
    );
  });

  // Wait until the first call is actually in flight before re-entering.
  await waitFor(() => {
    expect(result.current.isLoading).toBe(true);
  });

  // Second execute() while the first is unresolved — must reject with
  // BridgeBusyError, not the ambiguous undefined/undefined shape.
  let busyResolved:
    | { data: unknown; error: Error | null }
    | undefined;
  await act(async () => {
    busyResolved = await result.current.execute({
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-2',
    });
  });

  expect(busyResolved?.data).toBeUndefined();
  expect(busyResolved?.error).toBeInstanceOf(BridgeBusyError);
  expect((busyResolved?.error as BridgeBusyError).method).toBe(
    'payment:request',
  );

  // The first call must remain in flight and still resolve correctly.
  expect(result.current.isLoading).toBe(true);
  await act(async () => {
    await emit('payment:response', {
      status: 'paid',
      txHash: 'tx-first',
      reqId: firstReqId,
    });
  });

  const firstResolved = await firstPromise;
  expect(firstResolved.error).toBeNull();
  expect(firstResolved.data).toMatchObject({ status: 'paid', txHash: 'tx-first' });
  expect(result.current.isLoading).toBe(false);
});

test('useCallable - re-evaluates when provider Contract Version changes', () => {
  // Bridge must be present so callability() can return non-no-bridge results.
  setBridgeEnvironment({ bridge: true });

  // The wrapper is fixed at renderHook time, so use a captured variable
  // that the wrapper reads on every render. Mutating it + rerender()
  // simulates the AlienProvider receiving a new contractVersion.
  let contractVersion: '0.0.9' | '1.0.0' = '0.0.9';
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ControllableAlienProvider
      bridgeAvailable={true}
      contractVersion={contractVersion}
    >
      {children}
    </ControllableAlienProvider>
  );

  const { result, rerender } = renderHook(
    () => useCallable('payment:request'),
    { wrapper: Wrapper },
  );

  // payment:request requires 0.1.1; '0.0.9' is below it.
  expect(result.current).toMatchObject({
    callable: false,
    reason: 'host-outdated',
    has: '0.0.9',
    needs: '0.1.1',
  });

  // Bump the Contract Version and force a rerender.
  contractVersion = '1.0.0';
  rerender();

  expect(result.current).toEqual({ callable: true });
});
