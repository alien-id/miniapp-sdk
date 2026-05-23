import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { renderHook } from '@testing-library/react';
import { useEvent } from '../src/hooks/useEvent';
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

test('useEvent - does not warn when bridge IS available', () => {
  // Regression guard for auditor #5 N2: the previous implementation gated
  // on `useAlien().isBridgeAvailable`, which is initially `false` and only
  // flips to `true` after the provider's layout effect runs. That gating
  // produced a spurious "Event listener will not be set up" warning on
  // the consumer's initial render — even when the bridge was actually
  // present.
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});

  try {
    renderHook(() => useEvent('payment:response', () => {}), {
      wrapper: BridgeTestWrapper,
    });

    const warnings = warnSpy.mock.calls.map((args) => String(args[0] ?? ''));
    const eventWarnings = warnings.filter((w) =>
      w.includes('Event listener will not be set up'),
    );
    expect(eventWarnings.length).toBe(0);
  } finally {
    warnSpy.mockRestore();
  }
});

test('useEvent - does not warn in Dev Mode either', () => {
  // The bridge's `on()` is safe with or without the bridge — it registers
  // the listener against the internal emitter, and the listener simply
  // never fires in Dev Mode. No warning is needed: the AlienProvider
  // already prints a single "Bridge is not available" notice at boot.
  setBridgeEnvironment({ bridge: false });
  const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});

  try {
    renderHook(() => useEvent('payment:response', () => {}), {
      wrapper: BridgeTestWrapper,
    });

    const warnings = warnSpy.mock.calls.map((args) => String(args[0] ?? ''));
    const eventWarnings = warnings.filter((w) =>
      w.includes('Event listener will not be set up'),
    );
    expect(eventWarnings.length).toBe(0);
  } finally {
    warnSpy.mockRestore();
  }
});

test('useEvent - subscribes when bridge is available', () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });

  let calls = 0;
  const { unmount } = renderHook(
    () =>
      useEvent('payment:response', () => {
        calls += 1;
      }),
    { wrapper: BridgeTestWrapper },
  );

  // The hook returns void, but we should be able to mount/unmount
  // without throwing.
  expect(() => unmount()).not.toThrow();
  // The subscription was set up; we don't dispatch a real event here —
  // that's covered by bridge tests.
  expect(calls).toBe(0);
});
