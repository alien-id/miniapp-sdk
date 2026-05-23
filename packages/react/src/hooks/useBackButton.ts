import { on, send } from '@alien-id/miniapps-bridge';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAlien } from './useAlien';
import { useCallable } from './useCallable';

export interface UseBackButtonReturn {
  /** Whether the back button is currently visible. */
  isVisible: boolean;
  /** Show the back button. No-op if already visible. */
  show: () => void;
  /** Hide the back button. No-op if already hidden. */
  hide: () => void;
  /** Whether the back button method is Callable. */
  callable: boolean;
}

/**
 * Hook for the host app's back button.
 *
 * Manages visibility, listens for clicks, and handles cleanup automatically.
 * The back button is hidden on unmount to prevent stale UI in the host app.
 */
export function useBackButton(onPress?: () => void): UseBackButtonReturn {
  const { isBridgeAvailable } = useAlien();
  const { callable } = useCallable('host.back.button:toggle');
  const [isVisible, setIsVisible] = useState(false);
  const visibleRef = useRef(false);
  const onPressRef = useRef(onPress);
  // Sync in a layout effect so the ref reflects the latest callback by
  // the time React yields after commit — passive `useEffect` would
  // leave a stale-callback window between commit and effect flush where
  // a microtask-dispatched bridge event would see the previous closure.
  useLayoutEffect(() => {
    onPressRef.current = onPress;
  });

  // Subscribe to back button click events.
  // Uses ref so the subscription is stable regardless of
  // whether the consumer passes an inline function.
  useEffect(() => {
    if (!isBridgeAvailable) return;
    try {
      return on('host.back.button:clicked', () => {
        onPressRef.current?.();
      });
    } catch (error) {
      console.warn(
        '[@alien-id/miniapps-react] Failed to subscribe to host.back.button:clicked:',
        error instanceof Error ? error.message : String(error),
      );
      return;
    }
  }, [isBridgeAvailable]);

  const show = useCallback(() => {
    if (visibleRef.current) return;
    visibleRef.current = true;
    setIsVisible(true);
    const result = send.ifAvailable('host.back.button:toggle', {
      visible: true,
    });
    if (!result.ok && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[@alien-id/miniapps-react] host.back.button:toggle not callable:',
        result.error,
      );
    }
  }, []);

  const hide = useCallback(() => {
    if (!visibleRef.current) return;
    visibleRef.current = false;
    setIsVisible(false);
    const result = send.ifAvailable('host.back.button:toggle', {
      visible: false,
    });
    if (!result.ok && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[@alien-id/miniapps-react] host.back.button:toggle not callable:',
        result.error,
      );
    }
  }, []);

  // Hide back button on unmount to prevent stale native UI.
  useEffect(() => {
    return () => {
      if (!visibleRef.current) return;
      // Best-effort cleanup; warning would be noise during teardown.
      send.ifAvailable('host.back.button:toggle', { visible: false });
    };
  }, []);

  return useMemo(
    () => ({ isVisible, show, hide, callable }),
    [isVisible, show, hide, callable],
  );
}
