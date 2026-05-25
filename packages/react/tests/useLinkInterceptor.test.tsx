import { afterEach, beforeEach, expect, test } from 'bun:test';
import { renderHook } from '@testing-library/react';
import { useLinkInterceptor } from '../src/hooks/useLinkInterceptor';
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

test('useLinkInterceptor - mounts without throwing in Dev Mode (no bridge)', () => {
  // Regression guard for auditor #5 M2: the previous implementation gated
  // on `useAlien().isBridgeAvailable` in addition to `enableLinkInterceptor`'s
  // own internal bridge check. The React-side gate is redundant — the bridge
  // function already returns a no-op cleanup when no bridge is present.
  setBridgeEnvironment({ bridge: false });

  expect(() => {
    const { unmount } = renderHook(() => useLinkInterceptor(), {
      wrapper: BridgeTestWrapper,
    });
    unmount();
  }).not.toThrow();
});

test('useLinkInterceptor - attaches a click listener when the bridge is present', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });

  // Spy on addEventListener so we can confirm the interceptor wired itself
  // to the document. We don't simulate a click here — bridge tests already
  // cover the URL-routing logic; we just need to know the side effect ran.
  const original = document.addEventListener.bind(document);
  let attached = false;
  document.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => {
    if (type === 'click') attached = true;
    return original(type, listener, options);
  }) as typeof document.addEventListener;

  try {
    const { unmount } = renderHook(() => useLinkInterceptor(), {
      wrapper: BridgeTestWrapper,
    });
    expect(attached).toBe(true);
    unmount();
  } finally {
    document.addEventListener = original;
  }
});

test('useLinkInterceptor - reruns when openMode changes', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });

  let attachCount = 0;
  const originalAdd = document.addEventListener.bind(document);
  document.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => {
    if (type === 'click') attachCount += 1;
    return originalAdd(type, listener, options);
  }) as typeof document.addEventListener;

  try {
    const { rerender, unmount } = renderHook(
      ({ openMode }: { openMode: 'external' | 'internal' }) =>
        useLinkInterceptor({ openMode }),
      {
        wrapper: BridgeTestWrapper,
        initialProps: { openMode: 'external' },
      },
    );
    expect(attachCount).toBe(1);
    rerender({ openMode: 'internal' });
    expect(attachCount).toBe(2);
    unmount();
  } finally {
    document.addEventListener = originalAdd;
  }
});
