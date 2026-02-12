import { send } from '@alien_org/bridge';
import {
  type HapticImpactStyle,
  type HapticNotificationType,
  isMethodSupported,
} from '@alien_org/contract';
import { useCallback, useMemo } from 'react';
import { useAlien } from './useAlien';

export interface UseHapticReturn {
  /** Trigger impact feedback with the given style. */
  impactOccurred: (style: HapticImpactStyle) => void;
  /** Trigger notification feedback with the given type. */
  notificationOccurred: (type: HapticNotificationType) => void;
  /** Trigger selection change feedback. */
  selectionChanged: () => void;
  /** Whether haptic methods are supported by the host app. */
  supported: boolean;
}

/**
 * Hook for haptic feedback.
 *
 * All methods are fire-and-forget — they send a message to the host app
 * and return immediately with no response.
 *
 * @example
 * ```tsx
 * function HapticDemo() {
 *   const { impactOccurred, notificationOccurred, selectionChanged, supported } = useHaptic();
 *
 *   if (!supported) return null;
 *
 *   return (
 *     <>
 *       <button onClick={() => impactOccurred('medium')}>Tap</button>
 *       <button onClick={() => notificationOccurred('success')}>Success</button>
 *       <button onClick={() => selectionChanged()}>Select</button>
 *     </>
 *   );
 * }
 * ```
 */
export function useHaptic(): UseHapticReturn {
  const { contractVersion, isBridgeAvailable } = useAlien();

  const supported = contractVersion
    ? isMethodSupported('haptic:impact', contractVersion) &&
      isMethodSupported('haptic:notification', contractVersion) &&
      isMethodSupported('haptic:selection', contractVersion)
    : true;

  const impactOccurred = useCallback(
    (style: HapticImpactStyle) => {
      if (!isBridgeAvailable) return;
      if (
        contractVersion &&
        !isMethodSupported('haptic:impact', contractVersion)
      )
        return;
      send('haptic:impact', { style });
    },
    [isBridgeAvailable, contractVersion],
  );

  const notificationOccurred = useCallback(
    (type: HapticNotificationType) => {
      if (!isBridgeAvailable) return;
      if (
        contractVersion &&
        !isMethodSupported('haptic:notification', contractVersion)
      )
        return;
      send('haptic:notification', { type });
    },
    [isBridgeAvailable, contractVersion],
  );

  const selectionChanged = useCallback(() => {
    if (!isBridgeAvailable) return;
    if (
      contractVersion &&
      !isMethodSupported('haptic:selection', contractVersion)
    )
      return;
    send('haptic:selection', {});
  }, [isBridgeAvailable, contractVersion]);

  return useMemo(
    () => ({ impactOccurred, notificationOccurred, selectionChanged, supported }),
    [impactOccurred, notificationOccurred, selectionChanged, supported],
  );
}
