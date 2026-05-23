import { afterEach, beforeEach, expect, test } from 'bun:test';
import { render, waitFor } from '@testing-library/react';
import { AlienProvider } from '../src/context';
import { clearBridgeEnvironment, setBridgeEnvironment } from './test-utils';

beforeEach(() => {
  clearBridgeEnvironment();
  // Wipe any safe-area CSS vars a previous test may have written so each
  // assertion is starting from an empty inline style.
  const root = document.documentElement;
  root.style.removeProperty('--alien-safe-area-inset-top');
  root.style.removeProperty('--alien-safe-area-inset-right');
  root.style.removeProperty('--alien-safe-area-inset-bottom');
  root.style.removeProperty('--alien-safe-area-inset-left');
});

afterEach(() => {
  clearBridgeEnvironment();
});

test('AlienProvider - does not set safe-area CSS vars when launch params have no insets', async () => {
  // No bridge, no launch params: the Host injected nothing.
  setBridgeEnvironment({ bridge: false });

  render(
    <AlienProvider autoReady={false} interceptLinks={false}>
      <div data-testid="child">child</div>
    </AlienProvider>,
  );

  // Wait for the provider's layout effect to settle.
  await waitFor(() => {
    // The child renders synchronously; settle on a microtask.
    expect(document.querySelector('[data-testid="child"]')).not.toBeNull();
  });

  const root = document.documentElement;
  // The fix: when no insets were declared, the vars should remain empty —
  // not `0px`. CSS `env(safe-area-inset-top, 0px)` already provides the
  // fallback; writing `0px` here would clobber a useful default.
  expect(root.style.getPropertyValue('--alien-safe-area-inset-top')).toBe('');
  expect(root.style.getPropertyValue('--alien-safe-area-inset-right')).toBe(
    '',
  );
  expect(root.style.getPropertyValue('--alien-safe-area-inset-bottom')).toBe(
    '',
  );
  expect(root.style.getPropertyValue('--alien-safe-area-inset-left')).toBe('');
});

test('AlienProvider - writes safe-area CSS vars when launch params declare insets', async () => {
  setBridgeEnvironment({ bridge: true, contractVersion: '1.0.0' });
  const w = window as unknown as Record<string, unknown>;
  w.__ALIEN_SAFE_AREA_INSETS__ = { top: 44, right: 0, bottom: 34, left: 0 };

  render(
    <AlienProvider autoReady={false} interceptLinks={false}>
      <div data-testid="child">child</div>
    </AlienProvider>,
  );

  await waitFor(() => {
    expect(
      document.documentElement.style.getPropertyValue(
        '--alien-safe-area-inset-top',
      ),
    ).toBe('44px');
  });

  const root = document.documentElement;
  expect(root.style.getPropertyValue('--alien-safe-area-inset-top')).toBe(
    '44px',
  );
  expect(root.style.getPropertyValue('--alien-safe-area-inset-right')).toBe(
    '0px',
  );
  expect(root.style.getPropertyValue('--alien-safe-area-inset-bottom')).toBe(
    '34px',
  );
  expect(root.style.getPropertyValue('--alien-safe-area-inset-left')).toBe(
    '0px',
  );
});
