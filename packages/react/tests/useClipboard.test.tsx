import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import {
  BridgeBusyError,
  BridgeError,
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
  emit,
} from '@alien-id/miniapps-bridge';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useClipboard } from '../src/hooks/useClipboard';
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

test('useClipboard - callable is true when host supports both read and write', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const { result } = renderHook(() => useClipboard(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(true);
});

test('useClipboard - callable is false when bridge is absent', () => {
  setBridgeEnvironment({ bridge: false });
  const { result } = renderHook(() => useClipboard(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(false);
});

test('useClipboard - writeText posts clipboard:write message', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useClipboard(), {
    wrapper: BridgeTestWrapper,
  });
  act(() => {
    result.current.writeText('hello');
  });
  const writeCall = sent.find(
    (m) => m.type === 'method' && m.name === 'clipboard:write',
  );
  expect(writeCall).toBeDefined();
});

test('useClipboard - readText returns BridgeUnavailableError when bridge is missing', async () => {
  setBridgeEnvironment({ bridge: false });
  const { result } = renderHook(() => useClipboard(), {
    wrapper: BridgeTestWrapper,
  });

  let read: Awaited<ReturnType<typeof result.current.readText>> | undefined;
  await act(async () => {
    read = await result.current.readText();
  });

  expect(read?.ok).toBe(false);
  expect((read as { error?: unknown })?.error).toBeInstanceOf(
    BridgeUnavailableError,
  );
  expect(result.current.error).toBeInstanceOf(BridgeUnavailableError);
});

test('useClipboard - readText returns BridgeMethodUnsupportedError when host Contract Version is too low', async () => {
  // clipboard:read was added in 0.1.1; 0.1.0 must reject.
  setBridgeEnvironment({ bridge: true, contractVersion: '0.1.0' });
  const { result } = renderHook(() => useClipboard(), {
    wrapper: BridgeTestWrapper,
  });

  let read: Awaited<ReturnType<typeof result.current.readText>> | undefined;
  await act(async () => {
    read = await result.current.readText();
  });

  expect(read?.ok).toBe(false);
  expect((read as { error?: unknown })?.error).toBeInstanceOf(
    BridgeMethodUnsupportedError,
  );
});

test('useClipboard - readText resolves with text on successful host response', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useClipboard(), {
    wrapper: BridgeTestWrapper,
  });

  let readPromise!: Promise<
    Awaited<ReturnType<typeof result.current.readText>>
  >;
  act(() => {
    readPromise = result.current.readText();
  });

  await waitFor(() => {
    expect(result.current.isReading).toBe(true);
  });

  // Pull the reqId from the captured outgoing request.
  const outgoing = sent.find(
    (m) => m.type === 'method' && m.name === 'clipboard:read',
  );
  const reqId = outgoing?.payload?.reqId;
  expect(typeof reqId).toBe('string');

  await act(async () => {
    await emit('clipboard:response', {
      text: 'pasted',
      reqId: reqId as string,
    });
  });

  const read = await readPromise;
  expect(read).toEqual({ ok: true, text: 'pasted' });
  expect(result.current.isReading).toBe(false);
  expect(result.current.error).toBeNull();
});

test('useClipboard - readText exposes host-domain errorCode without a bridge error', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useClipboard(), {
    wrapper: BridgeTestWrapper,
  });

  let readPromise!: Promise<
    Awaited<ReturnType<typeof result.current.readText>>
  >;
  act(() => {
    readPromise = result.current.readText();
  });
  await waitFor(() => {
    expect(result.current.isReading).toBe(true);
  });

  const outgoing = sent.find(
    (m) => m.type === 'method' && m.name === 'clipboard:read',
  );
  const reqId = outgoing?.payload?.reqId as string;

  await act(async () => {
    await emit('clipboard:response', {
      text: null,
      errorCode: 'permission_denied',
      reqId,
    });
  });

  const read = await readPromise;
  expect(read).toEqual({ ok: false, errorCode: 'permission_denied' });
  expect(result.current.errorCode).toBe('permission_denied');
  expect(result.current.error).toBeNull();
});

test('useClipboard - overlapping readText() rejects the second call with BridgeBusyError', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useClipboard(), {
    wrapper: BridgeTestWrapper,
  });

  let firstPromise!: Promise<
    Awaited<ReturnType<typeof result.current.readText>>
  >;
  act(() => {
    firstPromise = result.current.readText();
  });

  await waitFor(() => {
    expect(result.current.isReading).toBe(true);
  });

  let busy: Awaited<ReturnType<typeof result.current.readText>> | undefined;
  await act(async () => {
    busy = await result.current.readText();
  });

  expect(busy?.ok).toBe(false);
  const busyError = (busy as { error?: unknown })?.error;
  expect(busyError).toBeInstanceOf(BridgeBusyError);
  expect((busyError as BridgeBusyError).method).toBe('clipboard:read');

  // First call must still resolve normally.
  const outgoing = sent.find(
    (m) => m.type === 'method' && m.name === 'clipboard:read',
  );
  const reqId = outgoing?.payload?.reqId as string;

  await act(async () => {
    await emit('clipboard:response', { text: 'final', reqId });
  });

  const first = await firstPromise;
  expect(first).toEqual({ ok: true, text: 'final' });
});

test('useClipboard - writeText warns in dev when bridge is unavailable', () => {
  setBridgeEnvironment({ bridge: false });
  const warn = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const { result } = renderHook(() => useClipboard(), {
      wrapper: BridgeTestWrapper,
    });
    act(() => {
      result.current.writeText('hello');
    });
    const sdkCalls = warn.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        args[0].includes('@alien-id/miniapps-react') &&
        args[0].includes('not callable'),
    );
    expect(sdkCalls.length).toBe(1);
    expect(sdkCalls[0]?.[0]).toContain('clipboard:write');
  } finally {
    warn.mockRestore();
  }
});

test('useClipboard - readText surfaces a BridgeError when host returns null text without errorCode', async () => {
  // Protocol violation: host claimed `ok` (no errorCode) but text is null.
  // Surface as a BridgeError so callers can distinguish from a legitimate
  // empty-string read.
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useClipboard(), {
    wrapper: BridgeTestWrapper,
  });

  let readPromise!: Promise<
    Awaited<ReturnType<typeof result.current.readText>>
  >;
  act(() => {
    readPromise = result.current.readText();
  });
  await waitFor(() => {
    expect(result.current.isReading).toBe(true);
  });

  const outgoing = sent.find(
    (m) => m.type === 'method' && m.name === 'clipboard:read',
  );
  const reqId = outgoing?.payload?.reqId as string;

  await act(async () => {
    await emit('clipboard:response', {
      text: null,
      reqId,
    });
  });

  const read = await readPromise;
  expect(read.ok).toBe(false);
  expect((read as { error?: unknown }).error).toBeInstanceOf(BridgeError);
  expect(result.current.error).toBeInstanceOf(BridgeError);
});

test('useClipboard - readText surfaces BridgeTimeoutError when the host never responds', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  setCapturingBridge();
  const { result } = renderHook(() => useClipboard({ timeout: 5 }), {
    wrapper: BridgeTestWrapper,
  });

  let read: Awaited<ReturnType<typeof result.current.readText>> | undefined;
  await act(async () => {
    read = await result.current.readText();
  });

  expect(read?.ok).toBe(false);
  expect((read as { error?: unknown })?.error).toBeInstanceOf(
    BridgeTimeoutError,
  );
  expect(result.current.error).toBeInstanceOf(BridgeTimeoutError);
});
