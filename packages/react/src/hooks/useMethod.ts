import {
  BridgeBusyError,
  type BridgeError,
  callability,
  request,
  type SafeRequestOptions,
} from '@alien-id/miniapps-bridge';
import type {
  EventName,
  EventPayload,
  MethodName,
  MethodPayload,
} from '@alien-id/miniapps-contract';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  callabilityError,
  useCallable,
  withSupportedAlias,
} from './useCallable';
import { useMounted } from './useMounted';

export interface UseMethodExecuteResult<E extends EventName> {
  data: EventPayload<E> | undefined;
  /**
   * Bridge error from the last attempted call, or `null` if there is no
   * error. `null` (not `undefined`) so consumers can distinguish "cleared"
   * from "not yet set" with a single equality check.
   */
  error: BridgeError | null;
}

interface UseMethodState<E extends EventName>
  extends UseMethodExecuteResult<E> {
  isLoading: boolean;
}

interface UseMethodResult<M extends MethodName, E extends EventName>
  extends UseMethodState<E> {
  execute: (
    params: Omit<MethodPayload<M>, 'reqId'>,
    options?: SafeRequestOptions,
  ) => Promise<UseMethodExecuteResult<E>>;
  reset: () => void;
  /**
   * Whether the Method is Callable in the current host — bridge present
   * AND the host's Contract Version declares this Method.
   */
  callable: boolean;
}

/**
 * Hook for making bridge requests with loading/error state management.
 *
 * `method` and `responseEvent` are independent generics — the caller is
 * responsible for pairing them correctly. Errors surface as
 * {@link BridgeError} subclasses (`BridgeUnavailableError`,
 * `BridgeMethodUnsupportedError`, `BridgeTimeoutError`) so callers can
 * narrow on `instanceof`.
 *
 * @example
 * ```tsx
 * import { useMethod } from '@alien-id/miniapps-react';
 *
 * function PayButton() {
 *   const { execute, data, error, isLoading, callable } = useMethod(
 *     'payment:request',
 *     'payment:response',
 *   );
 *
 *   if (!callable) return <div>This feature is not available</div>;
 *
 *   const handlePay = async () => {
 *     const { error, data } = await execute({
 *       recipient: 'wallet-123',
 *       amount: '100',
 *       token: 'SOL',
 *       network: 'solana',
 *       invoice: 'inv-123',
 *     });
 *     if (error) return console.error(error);
 *     if (data) console.log('Success:', data);
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
): UseMethodResult<M, E> {
  const contextCallability = useCallable(method);

  const [state, setState] = useState<UseMethodState<E>>({
    data: undefined,
    error: null,
    isLoading: false,
  });
  // Reject re-entry so two overlapping `execute()` calls can't race the
  // shared state slot — an older request resolving after a newer one
  // would otherwise clobber the correct result.
  const loadingRef = useRef(false);
  const mounted = useMounted();

  const execute = useCallback(
    async (
      params: Omit<MethodPayload<M>, 'reqId'>,
      requestOptions?: SafeRequestOptions,
    ): Promise<UseMethodExecuteResult<E>> => {
      // Reject re-entry with a typed busy error so the result shape stays
      // unambiguous — `{ data: undefined, error: undefined }` would be
      // indistinguishable from a successful response carrying no payload.
      if (loadingRef.current) {
        return {
          data: undefined,
          error: new BridgeBusyError(method),
        };
      }

      // If the caller supplies a `version` override, the context-derived
      // Callability snapshot is stale relative to the call. Re-evaluate
      // against the override so pre-call refusal matches what Safe Track
      // will do downstream.
      const effectiveCallability =
        requestOptions?.version !== undefined
          ? callability(method, { version: requestOptions.version })
          : contextCallability;

      // Short-circuit pre-call refusal so consumers don't observe a
      // transient `isLoading: true` before the immediate failure.
      const refusal = callabilityError(method, effectiveCallability);
      if (refusal) {
        setState({ data: undefined, error: refusal, isLoading: false });
        return { data: undefined, error: refusal };
      }

      loadingRef.current = true;
      setState({ data: undefined, error: null, isLoading: true });
      try {
        const result = await request.ifAvailable(
          method,
          params,
          responseEvent,
          requestOptions,
        );
        if (result.ok) {
          const { data } = result;
          if (mounted.current)
            setState({ data, error: null, isLoading: false });
          return { data, error: null };
        }
        const { error } = result;
        if (mounted.current)
          setState({ data: undefined, error, isLoading: false });
        return { data: undefined, error };
      } finally {
        loadingRef.current = false;
      }
    },
    [method, responseEvent, contextCallability, mounted],
  );

  const reset = useCallback(() => {
    setState({ data: undefined, error: null, isLoading: false });
  }, []);

  return useMemo(
    () =>
      withSupportedAlias({
        ...state,
        execute,
        reset,
        callable: contextCallability.callable,
      }),
    [state, execute, reset, contextCallability.callable],
  );
}
