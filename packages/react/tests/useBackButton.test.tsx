import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { emit } from '@alien-id/miniapps-bridge';
import { act, renderHook } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useBackButton } from '../src/hooks/useBackButton';
import {
  BridgeTestWrapper,
  clearBridgeEnvironment,
  setBridgeEnvironment,
} from './test-utils';

function setCapturingBridge(): Array<{
  type: string;
  name: string;
  payload: unknown;
}> {
  const sent: Array<{ type: string; name: string; payload: unknown }> = [];
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

test('useBackButton - callable is true when host supports host.back.button:toggle', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const { result } = renderHook(() => useBackButton(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(true);
});

test('useBackButton - callable is false when host Contract Version is below 1.0.0', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '0.2.4' });
  const { result } = renderHook(() => useBackButton(), {
    wrapper: BridgeTestWrapper,
  });
  expect(result.current.callable).toBe(false);
});

test('useBackButton - show() posts toggle visible:true and updates isVisible', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useBackButton(), {
    wrapper: BridgeTestWrapper,
  });

  expect(result.current.isVisible).toBe(false);
  act(() => result.current.show());

  expect(result.current.isVisible).toBe(true);
  const showCall = sent.find(
    (m) =>
      m.type === 'method' &&
      m.name === 'host.back.button:toggle' &&
      (m.payload as { visible?: boolean })?.visible === true,
  );
  expect(showCall).toBeDefined();
});

test('useBackButton - show() is a no-op when already visible', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useBackButton(), {
    wrapper: BridgeTestWrapper,
  });
  act(() => result.current.show());
  const sentAfterFirst = sent.length;
  act(() => result.current.show());
  expect(sent.length).toBe(sentAfterFirst);
});

test('useBackButton - hide() posts toggle visible:false and updates isVisible', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  const { result } = renderHook(() => useBackButton(), {
    wrapper: BridgeTestWrapper,
  });
  act(() => result.current.show());
  act(() => result.current.hide());

  expect(result.current.isVisible).toBe(false);
  const hideCall = sent.find(
    (m) =>
      m.type === 'method' &&
      m.name === 'host.back.button:toggle' &&
      (m.payload as { visible?: boolean })?.visible === false,
  );
  expect(hideCall).toBeDefined();
});

test('useBackButton - invokes onPress when host emits host.back.button:clicked', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  let pressed = 0;
  renderHook(
    () =>
      useBackButton(() => {
        pressed += 1;
      }),
    {
      wrapper: BridgeTestWrapper,
    },
  );

  await act(async () => {
    await emit('host.back.button:clicked', {});
  });

  expect(pressed).toBe(1);
});

test('useBackButton - invokes the latest onPress when the bridge event arrives in the same commit cycle', async () => {
  // Regression: ref sync used to live in `useEffect`, which flushes AFTER
  // layout effects. If a bridge event landed in the layout-effect phase of
  // a re-render, the back-button listener would call the previous render's
  // onPress closure. Mounting `useBackButton` next to a layout effect that
  // fires the click drives the event into that window.
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  // Box the value so TS can't narrow it to `null` after the initial
  // assignment — the harness mutates `.value` from a layout effect.
  const invoked: { value: 'A' | 'B' | null } = { value: null };
  const onPressA = () => {
    invoked.value = 'A';
  };
  const onPressB = () => {
    invoked.value = 'B';
  };

  function Harness({
    onPress,
    fireEvent,
  }: {
    onPress: () => void;
    fireEvent: boolean;
  }) {
    useBackButton(onPress);
    // Layout effect fires sync within the commit, but `emit` is microtask-
    // deferred (Emittery awaits a resolved Promise before invoking
    // listeners). Microtasks drain between layout and passive effects in
    // production — so this is exactly the window where a stale callback
    // could be observed.
    useLayoutEffect(() => {
      if (fireEvent) {
        void emit('host.back.button:clicked', {});
      }
    });
    return null;
  }

  // Use a raw React root so we control act() boundaries precisely.
  // testing-library's `render`/`rerender` always wrap in act and flush
  // both layout and passive effects, which hides the layout-vs-passive
  // race we're trying to expose.
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root;

  // Initial mount via act(): registers the bridge listener through
  // useBackButton's passive effect.
  await act(async () => {
    root = createRoot(container);
    root.render(
      <BridgeTestWrapper>
        <Harness onPress={onPressA} fireEvent={false} />
      </BridgeTestWrapper>,
    );
  });

  // Rerender OUTSIDE act so passive effects don't flush before our
  // microtask drain. The render schedules concurrent work; React 18
  // defers it via the scheduler.
  // biome-ignore lint/style/noNonNullAssertion: assigned above
  root!.render(
    <BridgeTestWrapper>
      <Harness onPress={onPressB} fireEvent={true} />
    </BridgeTestWrapper>,
  );

  // Drain microtasks. With useEffect-based ref sync, passive effects
  // are still pending here — the emit listener fires with stale A.
  // With useLayoutEffect-based ref sync, the ref is already B.
  for (let i = 0; i < 10; i++) await Promise.resolve();

  // Now drain everything else, including passive effects.
  await act(async () => {});

  expect(invoked.value).toBe('B');

  // Cleanup
  await act(async () => {
    // biome-ignore lint/style/noNonNullAssertion: assigned above
    root!.unmount();
  });
  container.remove();
});

test('useBackButton - show() warns in dev when bridge is unavailable', () => {
  setBridgeEnvironment({ bridge: false });
  const warn = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const { result } = renderHook(() => useBackButton(), {
      wrapper: BridgeTestWrapper,
    });
    act(() => result.current.show());
    const sdkCalls = warn.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        args[0].includes('@alien-id/miniapps-react') &&
        args[0].includes('not callable'),
    );
    expect(sdkCalls.length).toBe(1);
    expect(sdkCalls[0]?.[0]).toContain('host.back.button:toggle');
  } finally {
    warn.mockRestore();
  }
});

test('useBackButton - does not invoke onPress after unmount', async () => {
  // Regression: ensure the on() subscription is properly cleaned up on
  // unmount so a host-emitted click after unmount does not call the
  // stale callback.
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  let pressed = 0;
  const { unmount } = renderHook(
    () =>
      useBackButton(() => {
        pressed += 1;
      }),
    { wrapper: BridgeTestWrapper },
  );

  await act(async () => {
    await emit('host.back.button:clicked', {});
  });
  expect(pressed).toBe(1);

  unmount();

  await act(async () => {
    await emit('host.back.button:clicked', {});
  });
  // Listener was unsubscribed on unmount; onPress must not fire again.
  expect(pressed).toBe(1);
});

test('useBackButton - hides the back button on unmount if it was visible', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const sent = setCapturingBridge();
  const { result, unmount } = renderHook(() => useBackButton(), {
    wrapper: BridgeTestWrapper,
  });
  act(() => result.current.show());
  const sentBefore = sent.length;
  unmount();
  // Expect an additional toggle visible:false call after unmount.
  const hideAfter = sent
    .slice(sentBefore)
    .some(
      (m) =>
        m.type === 'method' &&
        m.name === 'host.back.button:toggle' &&
        (m.payload as { visible?: boolean })?.visible === false,
    );
  expect(hideAfter).toBe(true);
});
