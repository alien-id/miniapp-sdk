import { type RequestOptions, request } from '@alien_org/bridge';
import {
  type EventName,
  type EventPayload,
  getMethodMinVersion,
  isMethodSupported,
  type MethodName,
  type MethodPayload,
} from '@alien_org/contract';
import { useCallback, useMemo, useState } from 'react';
import { BridgeError, MethodNotSupportedError } from '../errors';
import { useAlien } from './useAlien';

export interface UseMethodExecuteResult<E extends EventName> {
  data: EventPayload<E> | undefined;
  error: Error | undefined;
}

interface UseMethodState<E extends EventName>
  extends UseMethodExecuteResult<E> {
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
  ) => Promise<UseMethodExecuteResult<E>>;
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
 * import { useMethod } from '@alien_org/react';
 *
 * function PayButton() {
 *   const { execute, data, error, isLoading, supported } = useMethod(
 *     'payment:request',
 *     'payment:response',
 *   );
 *
 *   if (!supported) {
 *     return <div>This feature is not available</div>;
 *   }
 *
 *   const handlePay = async () => {
 *     // Errors are automatically set in the `error` state - no try/catch needed!
 *     const { error, data } = await execute({
 *       recipient: 'wallet-123',
 *       amount: '100',
 *       token: 'SOL',
 *       network: 'solana',
 *       invoice: 'inv-123',
 *     });
 *     if (error) {
 *         console.error(error);
 *         return;
 *     }
 *     if (data) {
 *       console.log('Success:', data);
 *     }
 *   };
 *
 *   if (isLoading) return <button disabled>Loading...</button>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (data) return <div>Payment complete!</div>;
 *
 *   return <button onClick={handlePay}>Pay</button>;
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
    ): Promise<UseMethodExecuteResult<E>> => {
      // Check if bridge is available
      if (!isBridgeAvailable) {
        const error = new Error(
          'Bridge is not available. Running in dev mode? Bridge communication will not work.',
        );
        console.warn('[@alien_org/react]', error.message);
        setState({ data: undefined, error, isLoading: false });
        return { data: undefined, error };
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
          return { data: undefined, error };
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
        return { data: response, error: undefined };
      } catch (err) {
        // Handle bridge errors gracefully
        if (err instanceof BridgeError) {
          console.warn('[@alien_org/react] Bridge error:', err.message);
          setState({ data: undefined, error: err, isLoading: false });
          return { data: undefined, error: err };
        }

        // Handle other errors
        const error = err instanceof Error ? err : new Error(String(err));
        setState({ data: undefined, error, isLoading: false });
        return { data: undefined, error };
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
