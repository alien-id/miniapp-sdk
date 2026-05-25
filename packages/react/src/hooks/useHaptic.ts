import { send } from '@alien-id/miniapps-bridge';
import type {
  HapticImpactStyle,
  HapticNotificationType,
} from '@alien-id/miniapps-contract';
import { useCallback, useMemo } from 'react';
import { useCallable, withSupportedAlias } from './useCallable';

export interface UseHapticReturn {
  /** Trigger impact feedback with the given style. */
  impactOccurred: (style: HapticImpactStyle) => void;
  /** Trigger notification feedback with the given type. */
  notificationOccurred: (type: HapticNotificationType) => void;
  /** Trigger selection change feedback. */
  selectionChanged: () => void;
  /** Whether haptic methods are Callable. */
  callable: boolean;
}

/**
 * Hook for haptic feedback.
 *
 * All methods are fire-and-forget — they send a message to the host app
 * and return immediately with no response.
 */
export function useHaptic(): UseHapticReturn {
  const impactCallable = useCallable('haptic:impact').callable;
  const notificationCallable = useCallable('haptic:notification').callable;
  const selectionCallable = useCallable('haptic:selection').callable;
  const callable = impactCallable && notificationCallable && selectionCallable;

  const impactOccurred = useCallback((style: HapticImpactStyle) => {
    const result = send.ifAvailable('haptic:impact', { style });
    if (!result.ok && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[@alien-id/miniapps-react] haptic:impact not callable:',
        result.error,
      );
    }
  }, []);

  const notificationOccurred = useCallback((type: HapticNotificationType) => {
    const result = send.ifAvailable('haptic:notification', { type });
    if (!result.ok && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[@alien-id/miniapps-react] haptic:notification not callable:',
        result.error,
      );
    }
  }, []);

  const selectionChanged = useCallback(() => {
    const result = send.ifAvailable('haptic:selection', {});
    if (!result.ok && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[@alien-id/miniapps-react] haptic:selection not callable:',
        result.error,
      );
    }
  }, []);

  return useMemo(
    () =>
      withSupportedAlias({
        impactOccurred,
        notificationOccurred,
        selectionChanged,
        callable,
      }),
    [impactOccurred, notificationOccurred, selectionChanged, callable],
  );
}
