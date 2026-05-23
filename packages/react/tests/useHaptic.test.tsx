import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useHaptic } from '../src/hooks/useHaptic';
import {
  BridgeTestWrapper,
  clearBridgeEnvironment,
  setBridgeEnvironment,
} from './test-utils';

function setCapturingBridge(): string[] {
  const sent: string[] = [];
  (
    window as unknown as {
      __miniAppsBridge__: { postMessage: (data: string) => void };
    }
  ).__miniAppsBridge__ = {
    postMessage: (data: string) => {
      sent.push(data);
    },
  };
  return sent;
}

beforeEach(() => {
  clearBridgeEnvironment();
});

afterEach(() => {
  clearBridgeEnvironment();
});

test('useHaptic - callable is true when bridge is present and host supports all haptic methods', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const { result } = renderHook(() => useHaptic(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(true);
});

test('useHaptic - callable is false when bridge is absent', () => {
  setBridgeEnvironment({ bridge: false });
  const { result } = renderHook(() => useHaptic(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(false);
});

test('useHaptic - callable is false when host Contract Version is below haptic minimum', () => {
  // haptic:* methods were added in 0.2.4; 0.2.3 must reject.
  setBridgeEnvironment({ bridge: true, contractVersion: '0.2.3' });
  const { result } = renderHook(() => useHaptic(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(false);
});

test('useHaptic - impactOccurred() posts haptic:impact with the given style', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useHaptic(), {
    wrapper: BridgeTestWrapper,
  });
  act(() => {
    result.current.impactOccurred('heavy');
  });
  expect(sent.length).toBe(1);
  const parsed = JSON.parse(sent[0] ?? '{}');
  expect(parsed).toMatchObject({
    type: 'method',
    name: 'haptic:impact',
    payload: { style: 'heavy' },
  });
});

test('useHaptic - notificationOccurred() posts haptic:notification with the given type', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useHaptic(), {
    wrapper: BridgeTestWrapper,
  });
  act(() => {
    result.current.notificationOccurred('success');
  });
  expect(sent.length).toBe(1);
  const parsed = JSON.parse(sent[0] ?? '{}');
  expect(parsed).toMatchObject({
    type: 'method',
    name: 'haptic:notification',
    payload: { type: 'success' },
  });
});

test('useHaptic - selectionChanged() posts haptic:selection', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useHaptic(), {
    wrapper: BridgeTestWrapper,
  });
  act(() => {
    result.current.selectionChanged();
  });
  expect(sent.length).toBe(1);
  const parsed = JSON.parse(sent[0] ?? '{}');
  expect(parsed).toMatchObject({
    type: 'method',
    name: 'haptic:selection',
  });
});

test('useHaptic - methods are no-ops when bridge is unavailable', () => {
  setBridgeEnvironment({ bridge: false });
  const { result } = renderHook(() => useHaptic(), {
    wrapper: BridgeTestWrapper,
  });
  // Safe Track absorbs the missing bridge — no throw.
  expect(() =>
    act(() => {
      result.current.impactOccurred('light');
      result.current.notificationOccurred('error');
      result.current.selectionChanged();
    }),
  ).not.toThrow();
});

test('useHaptic - impactOccurred warns in dev when bridge is unavailable', () => {
  setBridgeEnvironment({ bridge: false });
  const warn = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const { result } = renderHook(() => useHaptic(), {
      wrapper: BridgeTestWrapper,
    });
    act(() => {
      result.current.impactOccurred('light');
    });
    const sdkCalls = warn.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        args[0].includes('@alien-id/miniapps-react') &&
        args[0].includes('not callable'),
    );
    expect(sdkCalls.length).toBe(1);
    expect(sdkCalls[0]?.[0]).toContain('haptic:impact');
  } finally {
    warn.mockRestore();
  }
});

test('useHaptic - notificationOccurred warns in dev when bridge is unavailable', () => {
  setBridgeEnvironment({ bridge: false });
  const warn = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const { result } = renderHook(() => useHaptic(), {
      wrapper: BridgeTestWrapper,
    });
    act(() => {
      result.current.notificationOccurred('success');
    });
    const sdkCalls = warn.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        args[0].includes('@alien-id/miniapps-react') &&
        args[0].includes('not callable'),
    );
    expect(sdkCalls.length).toBe(1);
    expect(sdkCalls[0]?.[0]).toContain('haptic:notification');
  } finally {
    warn.mockRestore();
  }
});

test('useHaptic - selectionChanged warns in dev when bridge is unavailable', () => {
  setBridgeEnvironment({ bridge: false });
  const warn = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const { result } = renderHook(() => useHaptic(), {
      wrapper: BridgeTestWrapper,
    });
    act(() => {
      result.current.selectionChanged();
    });
    const sdkCalls = warn.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        args[0].includes('@alien-id/miniapps-react') &&
        args[0].includes('not callable'),
    );
    expect(sdkCalls.length).toBe(1);
    expect(sdkCalls[0]?.[0]).toContain('haptic:selection');
  } finally {
    warn.mockRestore();
  }
});
