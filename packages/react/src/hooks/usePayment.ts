import { request } from '@alien-id/miniapps-bridge';
import type { EventPayload, MethodPayload } from '@alien-id/miniapps-contract';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  callabilityError,
  useCallable,
  withSupportedAlias,
} from './useCallable';
import { useMounted } from './useMounted';

// Derive types from contract - single source of truth
type PaymentRequestPayload = MethodPayload<'payment:request'>;
type PaymentResponsePayload = EventPayload<'payment:response'>;

/** Payment parameters (without reqId, which is auto-generated). */
export type PaymentParams = Omit<PaymentRequestPayload, 'reqId'>;

/** Payment response status from the host app. */
export type PaymentResponseStatus = PaymentResponsePayload['status'];

/** Payment error codes from the host app. */
export type PaymentErrorCode = NonNullable<PaymentResponsePayload['errorCode']>;

/** Payment status states for the hook. */
export type PaymentStatus = 'idle' | 'loading' | PaymentResponseStatus;

/**
 * Payment result returned after a payment attempt.
 */
export interface PaymentResult {
  status: PaymentStatus;
  txHash?: string;
  errorCode?: PaymentErrorCode;
  error?: Error;
}

/**
 * Callbacks for payment status changes.
 */
export interface PaymentCallbacks {
  /** Called when payment succeeds. */
  onPaid?: (txHash: string) => void;
  /** Called when user cancels the payment. */
  onCancelled?: () => void;
  /**
   * Called when payment fails.
   *
   * `errorCode` is the host's payment-domain code (`'insufficient_balance'`,
   * `'network_error'`, `'unknown'`). Pre-call refusals — bridge missing,
   * host's Contract Version below the method's min — also surface here
   * with `errorCode: 'unknown'`; in that case `error` is a typed
   * {@link BridgeError} subclass (`BridgeUnavailableError` or
   * `BridgeMethodUnsupportedError`). Branch on `error instanceof` to
   * tell pre-call refusals apart from real payment failures.
   */
  onFailed?: (errorCode: PaymentErrorCode, error?: Error) => void;
  /** Called on any status change. */
  onStatusChange?: (status: PaymentStatus) => void;
}

/**
 * Options for the usePayment hook.
 */
export interface UsePaymentOptions extends PaymentCallbacks {
  /**
   * Timeout for the payment request in milliseconds.
   * @default 120000 (2 minutes)
   */
  timeout?: number;
}

/**
 * Return type of the usePayment hook.
 */
export interface UsePaymentReturn {
  /** Current payment status. */
  status: PaymentStatus;
  /** Whether a payment is in progress. */
  isLoading: boolean;
  /** Whether the payment was successful. */
  isPaid: boolean;
  /** Whether the payment was cancelled. */
  isCancelled: boolean;
  /** Whether the payment failed. */
  isFailed: boolean;
  /** Transaction hash (present when paid). */
  txHash?: string;
  /** Error code (present when failed). */
  errorCode?: PaymentErrorCode;
  /**
   * Error object if an error occurred, or `null` if there is no error.
   * `null` (not `undefined`) so consumers can distinguish "cleared" from
   * "not yet set" with a single equality check.
   */
  error: Error | null;
  /** Initiate a payment. */
  pay: (params: PaymentParams) => Promise<PaymentResult>;
  /** Reset the payment state to idle. */
  reset: () => void;
  /** Whether the payment method is Callable. */
  callable: boolean;
}

interface PaymentState {
  status: PaymentStatus;
  txHash?: string;
  errorCode?: PaymentErrorCode;
  error?: Error;
}

/**
 * Hook for handling payments with full state management.
 *
 * Provides an easy-to-use interface for initiating payments and reacting
 * to status changes. Automatically handles loading states and errors.
 *
 * Pre-call refusal (bridge missing, host Contract Version too low) does
 * NOT transition through `'loading'` — `pay()` writes the typed bridge
 * error straight to `error`/`isFailed` state. `errorCode` is `'unknown'`
 * in that case; check `error instanceof BridgeMethodUnsupportedError`
 * (or `BridgeUnavailableError`) to distinguish from a real payment failure.
 */
export function usePayment(options: UsePaymentOptions = {}): UsePaymentReturn {
  const {
    timeout = 120000,
    onPaid,
    onCancelled,
    onFailed,
    onStatusChange,
  } = options;
  const paymentCallability = useCallable('payment:request');

  const callbacksRef = useRef({
    onPaid,
    onCancelled,
    onFailed,
    onStatusChange,
  });
  // Sync callbacks via effect so updates land at commit time, not mid-render.
  // Avoids torn-render hazards under React 18 concurrent mode.
  useEffect(() => {
    callbacksRef.current = { onPaid, onCancelled, onFailed, onStatusChange };
  });

  const [state, setState] = useState<PaymentState>({ status: 'idle' });
  const mounted = useMounted();

  const updateState = useCallback(
    (newState: PaymentState) => {
      if (!mounted.current) return;
      setState(newState);
      callbacksRef.current.onStatusChange?.(newState.status);
    },
    [mounted],
  );

  const loadingRef = useRef(false);

  const pay = useCallback(
    async (params: PaymentParams): Promise<PaymentResult> => {
      // Prevent concurrent payment calls
      if (loadingRef.current) return { status: 'loading' };

      // Short-circuit pre-call refusal so onStatusChange/state doesn't
      // briefly observe `loading` before resolving to `failed`.
      const refusal = callabilityError('payment:request', paymentCallability);
      if (refusal) {
        const result = {
          status: 'failed' as const,
          errorCode: 'unknown' as const,
          error: refusal,
        };
        updateState(result);
        callbacksRef.current.onFailed?.('unknown', refusal);
        return result;
      }

      // Validate required recipient field
      if (!params.recipient) {
        const error = new Error(
          'Payment recipient is required and must be a non-empty string.',
        );
        const result = {
          status: 'failed' as const,
          errorCode: 'unknown' as const,
          error,
        };
        updateState(result);
        callbacksRef.current.onFailed?.('unknown', error);
        return result;
      }

      loadingRef.current = true;
      updateState({ status: 'loading' });

      try {
        const response = await request.ifAvailable(
          'payment:request',
          params,
          'payment:response',
          { timeout },
        );

        if (!response.ok) {
          const result = {
            status: 'failed' as const,
            errorCode: 'unknown' as const,
            error: response.error,
          };
          updateState(result);
          callbacksRef.current.onFailed?.('unknown', response.error);
          return result;
        }

        const data = response.data;
        if (data.status === 'paid') {
          if (!data.txHash) {
            // Protocol violation: host claimed `paid` without a txHash.
            // Fail closed instead of treating empty string as success.
            const error = new Error(
              "Host returned status 'paid' without a txHash.",
            );
            const result = {
              status: 'failed' as const,
              errorCode: 'unknown' as const,
              error,
            };
            updateState(result);
            callbacksRef.current.onFailed?.('unknown', error);
            return result;
          }
          const result = { status: 'paid' as const, txHash: data.txHash };
          updateState(result);
          callbacksRef.current.onPaid?.(data.txHash);
          return result;
        }

        if (data.status === 'cancelled') {
          const result = { status: 'cancelled' as const };
          updateState(result);
          callbacksRef.current.onCancelled?.();
          return result;
        }

        // data.status === 'failed'
        const errorCode = data.errorCode ?? 'unknown';
        const result = { status: 'failed' as const, errorCode };
        updateState(result);
        callbacksRef.current.onFailed?.(errorCode);
        return result;
      } finally {
        loadingRef.current = false;
      }
    },
    [paymentCallability, timeout, updateState],
  );

  const reset = useCallback(() => {
    updateState({ status: 'idle' });
  }, [updateState]);

  return useMemo(
    () =>
      withSupportedAlias({
        status: state.status,
        isLoading: state.status === 'loading',
        isPaid: state.status === 'paid',
        isCancelled: state.status === 'cancelled',
        isFailed: state.status === 'failed',
        txHash: state.txHash,
        errorCode: state.errorCode,
        error: state.error ?? null,
        pay,
        reset,
        callable: paymentCallability.callable,
      }),
    [state, pay, reset, paymentCallability.callable],
  );
}
