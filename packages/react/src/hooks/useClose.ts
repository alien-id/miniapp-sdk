import { send } from '@alien-id/miniapps-bridge';
import { useCallback, useMemo } from 'react';
import { useCallable, withSupportedAlias } from './useCallable';

export interface UseCloseReturn {
  /** Close the miniapp. Fire-and-forget. */
  close: () => void;
  /** Whether the `app:close` method is Callable. */
  callable: boolean;
}

/**
 * Hook to close the miniapp.
 *
 * Sends a fire-and-forget `app:close` message to the host app, requesting
 * it to close the miniapp.
 */
export function useClose(): UseCloseReturn {
  const { callable } = useCallable('app:close');

  const close = useCallback(() => {
    const result = send.ifAvailable('app:close', {});
    if (!result.ok && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[@alien-id/miniapps-react] app:close not callable:',
        result.error,
      );
    }
  }, []);

  return useMemo(() => withSupportedAlias({ close, callable }), [close, callable]);
}
