import { request } from '@alien-id/miniapps-bridge';
import {
  isMethodSupported,
  type NotificationPermissionStatus,
} from '@alien-id/miniapps-contract';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useAlien } from './useAlien';

export type { NotificationPermissionStatus };

export interface UseNotificationPermissionOptions {
  /**
   * Timeout for the permission request in milliseconds.
   * @default 120000 (2 minutes — host consent drawer is user-driven)
   */
  timeout?: number;
}

export interface UseNotificationPermissionReturn {
  /** Last resolved status, or `null` until the first request completes. */
  status: NotificationPermissionStatus | null;
  /** Whether a permission request is in progress. */
  isLoading: boolean;
  /**
   * Prompt the user for notification permission. Resolves with the host's
   * status (`granted` | `denied` | `rate_limited`) or `null` if the bridge
   * is unavailable, the method is unsupported, or the request errored.
   */
  requestPermission: () => Promise<NotificationPermissionStatus | null>;
  /** Whether the host app supports the notifications permission method. */
  supported: boolean;
}

/**
 * Hook to request OS push-notification permission for this miniapp.
 *
 * The host shows a native consent drawer unless consent is already
 * `granted` or its per-miniapp prompt budget is exhausted (≤ 3 prompts
 * per rolling 24 h × `sessionAddress`), in which case it returns
 * `rate_limited` without surfacing UI.
 *
 * @example
 * ```tsx
 * function NotifyOptIn() {
 *   const { requestPermission, status, isLoading, supported } =
 *     useNotificationPermission();
 *
 *   if (!supported) return null;
 *   if (status === 'granted') return <span>Notifications on</span>;
 *
 *   return (
 *     <button onClick={requestPermission} disabled={isLoading}>
 *       {status === 'rate_limited' ? 'Try again later' : 'Enable notifications'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useNotificationPermission(
  options: UseNotificationPermissionOptions = {},
): UseNotificationPermissionReturn {
  const { timeout = 120000 } = options;
  const { contractVersion, isBridgeAvailable } = useAlien();

  const [status, setStatus] = useState<NotificationPermissionStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  const supported = contractVersion
    ? isMethodSupported('notifications:permission.request', contractVersion)
    : true;

  const requestPermission =
    useCallback(async (): Promise<NotificationPermissionStatus | null> => {
      if (loadingRef.current) return null;
      if (!isBridgeAvailable) return null;
      if (
        contractVersion &&
        !isMethodSupported('notifications:permission.request', contractVersion)
      )
        return null;

      loadingRef.current = true;
      setIsLoading(true);

      try {
        const response = await request(
          'notifications:permission.request',
          {},
          'notifications:permission.response',
          { timeout },
        );
        setStatus(response.status);
        return response.status;
      } catch {
        return null;
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }, [isBridgeAvailable, contractVersion, timeout]);

  return useMemo(
    () => ({ status, isLoading, requestPermission, supported }),
    [status, isLoading, requestPermission, supported],
  );
}
