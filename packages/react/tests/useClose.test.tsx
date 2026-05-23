import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useClose } from '../src/hooks/useClose';
import {
  BridgeTestWrapper,
  clearBridgeEnvironment,
  setBridgeEnvironment,
} from './test-utils';

beforeEach(() => {
  clearBridgeEnvironment();
});

afterEach(() => {
  clearBridgeEnvironment();
});

test('useClose - callable is true when bridge is present and host supports app:close', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const { result } = renderHook(() => useClose(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(true);
});

test('useClose - callable is false when bridge is absent', () => {
  setBridgeEnvironment({ bridge: false });
  const { result } = renderHook(() => useClose(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(false);
});

test('useClose - callable is false when host Contract Version is below app:close min', () => {
  // app:close was added in 1.0.0; 0.2.4 must reject.
  setBridgeEnvironment({ bridge: true, contractVersion: '0.2.4' });
  const { result } = renderHook(() => useClose(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(false);
});

test('useClose - close() posts an app:close method message when callable', () => {
  const sent: string[] = [];
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  // Override the bridge stub with a capturing implementation.
  (window as unknown as { __miniAppsBridge__: { postMessage: (data: string) => void } }).__miniAppsBridge__ = {
    postMessage: (data: string) => {
      sent.push(data);
    },
  };

  const { result } = renderHook(() => useClose(), {
    wrapper: BridgeTestWrapper,
  });
  act(() => {
    result.current.close();
  });

  expect(sent.length).toBe(1);
  const parsed = JSON.parse(sent[0] ?? '{}');
  expect(parsed).toMatchObject({
    type: 'method',
    name: 'app:close',
  });
});

test('useClose - close() is a no-op when bridge is unavailable', () => {
  setBridgeEnvironment({ bridge: false });
  const { result } = renderHook(() => useClose(), {
    wrapper: BridgeTestWrapper,
  });
  // Should not throw even though bridge is missing.
  expect(() => act(() => result.current.close())).not.toThrow();
});

test('useClose - close() warns in dev when bridge is unavailable', () => {
  setBridgeEnvironment({ bridge: false });
  const warn = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const { result } = renderHook(() => useClose(), {
      wrapper: BridgeTestWrapper,
    });
    act(() => {
      result.current.close();
    });
    const sdkCalls = warn.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        args[0].includes('@alien-id/miniapps-react') &&
        args[0].includes('not callable'),
    );
    expect(sdkCalls.length).toBe(1);
    expect(sdkCalls[0]?.[0]).toContain('app:close');
  } finally {
    warn.mockRestore();
  }
});
