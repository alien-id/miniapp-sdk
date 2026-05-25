import {
  BridgeBusyError,
  type BridgeError,
  request,
} from '@alien-id/miniapps-bridge';
import type { NotificationPermissionStatus } from '@alien-id/miniapps-contract';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  callabilityError,
  useCallable,
  withSupportedAlias,
} from './useCallable';
import { useMounted } from './useMounted';

export type { NotificationPermissionStatus };

export interface UseNotificationPermissionOptions {
  /**
   * Timeout for the permission request in milliseconds.
   * @default 120000 (2 minutes — host consent drawer is user-driven)
   */
  timeout?: number;
}

/**
 * Outcome of a permission request.
 *
 * - `ok: true` — host responded with a status.
 * - `ok: false` — pre-call refusal or transport failure: typed
 *   {@link BridgeError} subclass (`BridgeUnavailableError`,
 *   `BridgeMethodUnsupportedError`, `BridgeTimeoutError`).
 */
export type NotificationPermissionResult =
  | { ok: true; status: NotificationPermissionStatus }
  | { ok: false; error: BridgeError };

export interface UseNotificationPermissionReturn {
  /** Last resolved status, or `null` until a request succeeds. */
  status: NotificationPermissionStatus | null;
  /** Whether a permission request is in progress. */
  isLoading: boolean;
  /**
   * Bridge error from the last failed permission request (pre-call refusal,
   * timeout, transport). Null when the last request succeeded.
   */
  error: BridgeError | null;
  /**
   * Prompt the user for notification permission. Resolves with a
   * discriminated result so callers can distinguish a host status from a
   * bridge failure.
   */
  requestPermission: () => Promise<NotificationPermissionResult>;
  /** Whether the notifications-permission method is Callable. */
  callable: boolean;
}

/**
 * Hook to request OS push-notification permission for this miniapp.
 *
 * The host shows a native consent drawer unless consent is already
 * `granted` or its per-miniapp prompt budget is exhausted, in which case it
 * returns `rate_limited` without surfacing UI.
 */
export function useNotificationPermission(
  options: UseNotificationPermissionOptions = {},
): UseNotificationPermissionReturn {
  const { timeout = 120000 } = options;
  const permissionCallability = useCallable('notifications:permission.request');

  const [status, setStatus] = useState<NotificationPermissionStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<BridgeError | null>(null);
  const loadingRef = useRef(false);
  const mounted = useMounted();

  const requestPermission =
    useCallback(async (): Promise<NotificationPermissionResult> => {
      if (loadingRef.current) {
        return {
          ok: false,
          error: new BridgeBusyError('notifications:permission.request'),
        };
      }

      // Short-circuit pre-call refusal so `isLoading` doesn't flicker and
      // callers see the typed bridge error directly.
      const refusal = callabilityError(
        'notifications:permission.request',
        permissionCallability,
      );
      if (refusal) {
        setError(refusal);
        return { ok: false, error: refusal };
      }

      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const result = await request.ifAvailable(
          'notifications:permission.request',
          {},
          'notifications:permission.response',
          { timeout },
        );
        if (!result.ok) {
          const { error: bridgeError } = result;
          if (mounted.current) setError(bridgeError);
          return { ok: false, error: bridgeError };
        }
        if (mounted.current) setStatus(result.data.status);
        return { ok: true, status: result.data.status };
      } finally {
        loadingRef.current = false;
        if (mounted.current) setIsLoading(false);
      }
    }, [permissionCallability, timeout, mounted]);

  return useMemo(
    () =>
      withSupportedAlias({
        status,
        isLoading,
        error,
        requestPermission,
        callable: permissionCallability.callable,
      }),
    [
      status,
      isLoading,
      error,
      requestPermission,
      permissionCallability.callable,
    ],
  );
}
