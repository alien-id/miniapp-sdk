import { type RequestOptions, request } from '@alien-id/bridge';
import {
  type EventName,
  type EventPayload,
  getMethodMinVersion,
  isMethodSupported,
  type MethodName,
  type MethodPayload,
} from '@alien-id/contract';
import { useCallback, useMemo, useState } from 'react';
import { BridgeError, MethodNotSupportedError } from '../errors';
import { useAlien } from './useAlien';

interface UseMethodState<E extends EventName> {
  data: EventPayload<E> | undefined;
  error: Error | undefined;
  isLoading: boolean;
}

export interface UseMethodOptions {
  /**
   * Whether to check if the method is supported before executing.
   * If unsupported, sets error state with `MethodNotSupportedError`.
   * @default true
   */
  checkVersion?: boolean;
}

interface UseMethodResult<M extends MethodName, E extends EventName>
  extends UseMethodState<E> {
  execute: (
    params: Omit<MethodPayload<M>, 'reqId'>,
    options?: RequestOptions,
  ) => Promise<EventPayload<E> | undefined>;
  reset: () => void;
  /**
   * Whether the method is supported by the current contract version.
   */
  supported: boolean;
}

/**
 * Hook for making bridge requests with loading/error state management.
 *
 * @param method - The method name to call.
 * @param responseEvent - The event name to listen for the response.
 * @param options - Hook options including version checking.
 * @returns Object with `execute`, `reset`, `data`, `error`, `isLoading`, and `supported`.
 *
 * @example
 * ```tsx
 * import { useMethod } from '@alien-id/react';
 *
 * function AuthButton() {
 *   const { execute, data, error, isLoading, supported } = useMethod(
 *     'auth.init:request',
 *     'auth.init:response.token',
 *   );
 *
 *   if (!supported) {
 *     return <div>This feature is not available</div>;
 *   }
 *
 *   const handleAuth = async () => {
 *     // Errors are automatically set in the `error` state - no try/catch needed!
 *     const response = await execute({ appId: 'my-app', challenge: 'random' });
 *     if (response) {
 *       console.log('Success:', response);
 *     }
 *   };
 *
 *   if (isLoading) return <button disabled>Loading...</button>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (data) return <div>Authenticated!</div>;
 *
 *   return <button onClick={handleAuth}>Authenticate</button>;
 * }
 * ```
 */
export function useMethod<M extends MethodName, E extends EventName>(
  method: M,
  responseEvent: E,
  options: UseMethodOptions = {},
): UseMethodResult<M, E> {
  const { checkVersion = true } = options;
  const { contractVersion, isBridgeAvailable } = useAlien();

  const [state, setState] = useState<UseMethodState<E>>({
    data: undefined,
    error: undefined,
    isLoading: false,
  });

  // Check if method is supported - only check if version exists
  const supported = contractVersion
    ? isMethodSupported(method, contractVersion)
    : true; // Fallback: assume supported if no version provided

  const execute = useCallback(
    async (
      params: Omit<MethodPayload<M>, 'reqId'>,
      requestOptions?: RequestOptions,
    ): Promise<EventPayload<E> | undefined> => {
      // Check if bridge is available
      if (!isBridgeAvailable) {
        const error = new Error(
          'Bridge is not available. Running in dev mode? Bridge communication will not work.',
        );
        console.warn('[@alien-id/react]', error.message);
        setState({ data: undefined, error, isLoading: false });
        return;
      }

      // Check version support before executing
      if (checkVersion) {
        if (contractVersion && !isMethodSupported(method, contractVersion)) {
          const error = new MethodNotSupportedError(
            method,
            contractVersion,
            getMethodMinVersion(method),
          );
          setState({ data: undefined, error, isLoading: false });
          return;
        }
      }

      setState({ data: undefined, error: undefined, isLoading: true });

      try {
        const response = await request(
          method,
          params,
          responseEvent,
          requestOptions,
        );
        setState({ data: response, error: undefined, isLoading: false });
        return response;
      } catch (err) {
        // Handle bridge errors gracefully
        if (err instanceof BridgeError) {
          console.warn('[@alien-id/react] Bridge error:', err.message);
          const error = new Error(
            `Bridge communication failed: ${err.message}`,
          );
          setState({ data: undefined, error, isLoading: false });
          return;
        }

        // Handle other errors
        const error = err instanceof Error ? err : new Error(String(err));
        setState({ data: undefined, error, isLoading: false });
        return;
      }
    },
    [method, responseEvent, checkVersion, contractVersion, isBridgeAvailable],
  );

  const reset = useCallback(() => {
    setState({ data: undefined, error: undefined, isLoading: false });
  }, []);

  return useMemo(
    () => ({ ...state, execute, reset, supported }),
    [state, execute, reset, supported],
  );
}
