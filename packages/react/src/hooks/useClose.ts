import { send } from '@alien-id/miniapps-bridge';
import { isMethodSupported } from '@alien-id/miniapps-contract';
import { useCallback, useMemo } from 'react';
import { useAlien } from './useAlien';

export interface UseCloseReturn {
  /** Close the miniapp. Fire-and-forget — sends the message and returns immediately. */
  close: () => void;
  /** Whether the `app:close` method is supported by the host app. */
  supported: boolean;
}

/**
 * Hook to close the miniapp.
 *
 * Sends a fire-and-forget `app:close` message to the host app,
 * requesting it to close the miniapp.
 *
 * @example
 * ```tsx
 * function CloseButton() {
 *   const { close, supported } = useClose();
 *
 *   if (!supported) return null;
 *
 *   return <button onClick={close}>Close</button>;
 * }
 * ```
 */
export function useClose(): UseCloseReturn {
  const { contractVersion } = useAlien();

  const supported = contractVersion
    ? isMethodSupported('app:close', contractVersion)
    : true;

  const close = useCallback(() => {
    send.ifAvailable('app:close', {}, { version: contractVersion });
  }, [contractVersion]);

  return useMemo(() => ({ close, supported }), [close, supported]);
}
