import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
  BridgeBusyError,
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
  emit,
} from '@alien-id/miniapps-bridge';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useNotificationPermission } from '../src/hooks/useNotificationPermission';
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

beforeEach(() => {
  clearBridgeEnvironment();
});

afterEach(() => {
  clearBridgeEnvironment();
});

test('useNotificationPermission - callable is true on supported host', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.5.0' });
  const { result } = renderHook(() => useNotificationPermission(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(true);
});

test('useNotificationPermission - callable is false when host Contract Version is below 1.5.0', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.4.9' });
  const { result } = renderHook(() => useNotificationPermission(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(false);
});

test('useNotificationPermission - returns BridgeUnavailableError when bridge is missing', async () => {
  setBridgeEnvironment({ bridge: false });
  const { result } = renderHook(() => useNotificationPermission(), {
    wrapper: BridgeTestWrapper,
  });

  let res: Awaited<ReturnType<typeof result.current.requestPermission>>
    | undefined;
  await act(async () => {
    res = await result.current.requestPermission();
  });

  expect(res?.ok).toBe(false);
  expect((res as { error?: unknown })?.error).toBeInstanceOf(
    BridgeUnavailableError,
  );
  expect(result.current.error).toBeInstanceOf(BridgeUnavailableError);
});

test('useNotificationPermission - returns BridgeMethodUnsupportedError when host is too old', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.4.0' });
  const { result } = renderHook(() => useNotificationPermission(), {
    wrapper: BridgeTestWrapper,
  });

  let res: Awaited<ReturnType<typeof result.current.requestPermission>>
    | undefined;
  await act(async () => {
    res = await result.current.requestPermission();
  });

  expect(res?.ok).toBe(false);
  expect((res as { error?: unknown })?.error).toBeInstanceOf(
    BridgeMethodUnsupportedError,
  );
});

test('useNotificationPermission - resolves with host status on success and updates state', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.5.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useNotificationPermission(), {
    wrapper: BridgeTestWrapper,
  });

  let resPromise!: Promise<
    Awaited<ReturnType<typeof result.current.requestPermission>>
  >;
  act(() => {
    resPromise = result.current.requestPermission();
  });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(true);
  });

  const outgoing = sent.find(
    (m) =>
      m.type === 'method' && m.name === 'notifications:permission.request',
  );
  const reqId = outgoing?.payload?.reqId as string;

  await act(async () => {
    await emit('notifications:permission.response', {
      status: 'granted',
      reqId,
    });
  });

  const res = await resPromise;
  expect(res).toEqual({ ok: true, status: 'granted' });
  expect(result.current.status).toBe('granted');
  expect(result.current.isLoading).toBe(false);
  expect(result.current.error).toBeNull();
});

test('useNotificationPermission - overlapping requestPermission() rejects the second call with BridgeBusyError', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.5.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useNotificationPermission(), {
    wrapper: BridgeTestWrapper,
  });

  let firstPromise!: Promise<
    Awaited<ReturnType<typeof result.current.requestPermission>>
  >;
  act(() => {
    firstPromise = result.current.requestPermission();
  });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(true);
  });

  let busy:
    | Awaited<ReturnType<typeof result.current.requestPermission>>
    | undefined;
  await act(async () => {
    busy = await result.current.requestPermission();
  });

  expect(busy?.ok).toBe(false);
  const busyError = (busy as { error?: unknown })?.error;
  expect(busyError).toBeInstanceOf(BridgeBusyError);
  expect((busyError as BridgeBusyError).method).toBe(
    'notifications:permission.request',
  );

  // First call must still resolve normally.
  const outgoing = sent.find(
    (m) =>
      m.type === 'method' && m.name === 'notifications:permission.request',
  );
  const reqId = outgoing?.payload?.reqId as string;

  await act(async () => {
    await emit('notifications:permission.response', {
      status: 'granted',
      reqId,
    });
  });

  const first = await firstPromise;
  expect(first).toEqual({ ok: true, status: 'granted' });
});

test('useNotificationPermission - surfaces BridgeTimeoutError when host never responds', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.5.0' });
  setCapturingBridge();
  const { result } = renderHook(
    () => useNotificationPermission({ timeout: 5 }),
    { wrapper: BridgeTestWrapper },
  );

  let res: Awaited<ReturnType<typeof result.current.requestPermission>>
    | undefined;
  await act(async () => {
    res = await result.current.requestPermission();
  });

  expect(res?.ok).toBe(false);
  expect((res as { error?: unknown })?.error).toBeInstanceOf(
    BridgeTimeoutError,
  );
  expect(result.current.error).toBeInstanceOf(BridgeTimeoutError);
});
