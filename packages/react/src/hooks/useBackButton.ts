import { on, send } from '@alien_org/bridge';
import { isMethodSupported } from '@alien_org/contract';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAlien } from './useAlien';

export interface UseBackButtonReturn {
  /** Whether the back button is currently visible. */
  isVisible: boolean;
  /** Show the back button. No-op if already visible. */
  show: () => void;
  /** Hide the back button. No-op if already hidden. */
  hide: () => void;
  /** Whether the back button method is supported by the host app. */
  supported: boolean;
}

/**
 * Hook for the host app's back button.
 *
 * Manages visibility, listens for clicks, and handles cleanup automatically.
 * The back button is hidden on unmount to prevent stale UI in the host app.
 *
 * @param onPress - Callback fired when the back button is pressed.
 *   Stabilized internally via ref — safe to pass inline functions.
 *
 * @example
 * ```tsx
 * // Show back button while this screen is mounted
 * function DetailScreen() {
 *   const { show, hide } = useBackButton(() => {
 *     navigate(-1);
 *   });
 *
 *   useEffect(() => {
 *     show();
 *     return () => hide();
 *   }, [show, hide]);
 *
 *   return <div>Detail content</div>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Conditional visibility based on navigation depth
 * function App() {
 *   const { show, hide } = useBackButton(() => {
 *     router.back();
 *   });
 *
 *   useEffect(() => {
 *     if (canGoBack) show();
 *     else hide();
 *   }, [canGoBack, show, hide]);
 *
 *   return <Outlet />;
 * }
 * ```
 */
export function useBackButton(onPress?: () => void): UseBackButtonReturn {
  const { contractVersion, isBridgeAvailable } = useAlien();
  const [isVisible, setIsVisible] = useState(false);
  const visibleRef = useRef(false);
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const supported = contractVersion
    ? isMethodSupported('host.back.button:toggle', contractVersion)
    : true;

  // Subscribe to back button click events.
  // Uses ref so the subscription is stable regardless of
  // whether the consumer passes an inline function.
  useEffect(() => {
    if (!isBridgeAvailable) return;
    try {
      return on('host.back.button:clicked', () => {
        onPressRef.current?.();
      });
    } catch {
      return;
    }
  }, [isBridgeAvailable]);

  const show = useCallback(() => {
    if (visibleRef.current) return;
    visibleRef.current = true;
    setIsVisible(true);
    if (!isBridgeAvailable) return;
    if (
      contractVersion &&
      !isMethodSupported('host.back.button:toggle', contractVersion)
    )
      return;
    send('host.back.button:toggle', { visible: true });
  }, [isBridgeAvailable, contractVersion]);

  const hide = useCallback(() => {
    if (!visibleRef.current) return;
    visibleRef.current = false;
    setIsVisible(false);
    if (!isBridgeAvailable) return;
    if (
      contractVersion &&
      !isMethodSupported('host.back.button:toggle', contractVersion)
    )
      return;
    send('host.back.button:toggle', { visible: false });
  }, [isBridgeAvailable, contractVersion]);

  // Hide back button on unmount to prevent stale native UI.
  // Wrapped in try-catch because send() throws if the bridge
  // object is gone (e.g. WebView being torn down).
  useEffect(() => {
    return () => {
      if (!visibleRef.current || !isBridgeAvailable) return;
      try {
        send('host.back.button:toggle', { visible: false });
      } catch {
        // Bridge already gone — nothing to clean up
      }
    };
  }, [isBridgeAvailable]);

  return useMemo(
    () => ({ isVisible, show, hide, supported }),
    [isVisible, show, hide, supported],
  );
}
