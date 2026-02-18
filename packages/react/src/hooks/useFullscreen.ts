import { on, send } from '@alien_org/bridge';
import type { FullscreenErrorCode } from '@alien_org/contract';
import { isMethodSupported } from '@alien_org/contract';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAlien } from './useAlien';
import { useLaunchParams } from './useLaunchParams';

export interface UseFullscreenReturn {
  /** Whether the miniapp is currently in fullscreen mode. */
  isFullscreen: boolean;
  /** Request fullscreen mode. Fire-and-forget — host responds with events. */
  requestFullscreen: () => void;
  /** Exit fullscreen mode. Fire-and-forget — host responds with events. */
  exitFullscreen: () => void;
  /** Whether fullscreen methods are supported by the host app. */
  supported: boolean;
  /** Last error from a failed fullscreen request, or `null`. Resets on next successful state change. */
  error: FullscreenErrorCode | null;
}

/**
 * Hook for fullscreen mode.
 *
 * Manages fullscreen state, listens for host app events, and exposes
 * enter/exit actions. Methods are fire-and-forget — they send a message
 * to the host app which responds with `fullscreen:changed` or `fullscreen:failed` events.
 *
 * Initial state is derived from launch params (`isFullscreen` flag set by host app
 * when opening a miniapp directly in fullscreen mode).
 *
 * @example
 * ```tsx
 * function FullscreenDemo() {
 *   const { isFullscreen, requestFullscreen, exitFullscreen, supported, error } = useFullscreen();
 *
 *   if (!supported) return <div>Fullscreen not supported</div>;
 *
 *   return (
 *     <>
 *       <button onClick={isFullscreen ? exitFullscreen : requestFullscreen}>
 *         {isFullscreen ? 'Exit Fullscreen' : 'Go Fullscreen'}
 *       </button>
 *       {error && <p>Fullscreen error: {error}</p>}
 *     </>
 *   );
 * }
 * ```
 */
export function useFullscreen(): UseFullscreenReturn {
  const { contractVersion, isBridgeAvailable } = useAlien();
  const launchParams = useLaunchParams();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<FullscreenErrorCode | null>(null);

  // Sync initial state from launch params (fires once when params load)
  useEffect(() => {
    if (launchParams?.isFullscreen) {
      setIsFullscreen(true);
    }
  }, [launchParams?.isFullscreen]);

  const supported = contractVersion
    ? isMethodSupported('fullscreen:request', contractVersion) &&
      isMethodSupported('fullscreen:exit', contractVersion)
    : true;

  // Subscribe to fullscreen:changed event
  useEffect(() => {
    if (!isBridgeAvailable) return;
    try {
      return on('fullscreen:changed', (payload) => {
        setIsFullscreen(payload.isFullscreen);
        setError(null);
      });
    } catch {
      return;
    }
  }, [isBridgeAvailable]);

  // Subscribe to fullscreen:failed event
  useEffect(() => {
    if (!isBridgeAvailable) return;
    try {
      return on('fullscreen:failed', (payload) => {
        setError(payload.error);
      });
    } catch {
      return;
    }
  }, [isBridgeAvailable]);

  const requestFullscreen = useCallback(() => {
    if (!isBridgeAvailable) return;
    if (
      contractVersion &&
      !isMethodSupported('fullscreen:request', contractVersion)
    )
      return;
    send('fullscreen:request', {});
  }, [isBridgeAvailable, contractVersion]);

  const exitFullscreen = useCallback(() => {
    if (!isBridgeAvailable) return;
    if (
      contractVersion &&
      !isMethodSupported('fullscreen:exit', contractVersion)
    )
      return;
    send('fullscreen:exit', {});
  }, [isBridgeAvailable, contractVersion]);

  return useMemo(
    () => ({
      isFullscreen,
      requestFullscreen,
      exitFullscreen,
      supported,
      error,
    }),
    [isFullscreen, requestFullscreen, exitFullscreen, supported, error],
  );
}
