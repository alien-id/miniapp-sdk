import { afterEach, beforeEach, expect, test } from 'bun:test';
import { renderHook } from '@testing-library/react';
import { useCallable } from '../src/hooks/useCallable';
import {
  BridgeTestWrapper,
  ControllableAlienProvider,
  clearBridgeEnvironment,
  setBridgeEnvironment,
} from './test-utils';

beforeEach(() => {
  clearBridgeEnvironment();
});

afterEach(() => {
  clearBridgeEnvironment();
});

test('useCallable - returns { callable: true } when bridge is present and Contract Version supports the Method', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });

  const { result } = renderHook(() => useCallable('payment:request'), {
    wrapper: BridgeTestWrapper,
  });

  expect(result.current).toEqual({ callable: true });
});

test('useCallable - returns { callable: false, reason: "no-bridge" } when bridge is absent', () => {
  setBridgeEnvironment({ bridge: false, contractVersion: '1.0.0' });

  const { result } = renderHook(() => useCallable('payment:request'), {
    wrapper: BridgeTestWrapper,
  });

  expect(result.current).toEqual({ callable: false, reason: 'no-bridge' });
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
