import { request } from '@alien_org/bridge';
import {
  type EventPayload,
  getMethodMinVersion,
  isMethodSupported,
  type MethodPayload,
} from '@alien_org/contract';
import { useCallback, useMemo, useRef, useState } from 'react';
import { BridgeError, MethodNotSupportedError } from '../errors';
import { useAlien } from './useAlien';

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
  /** Called when payment fails. */
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
  /** Error object if an error occurred. */
  error?: Error;
  /** Initiate a payment. */
  pay: (params: PaymentParams) => Promise<PaymentResult>;
  /** Reset the payment state to idle. */
  reset: () => void;
  /** Whether the payment method is supported by the host app. */
  supported: boolean;
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
 * to status changes. Automatically handles loading states, errors, and
 * version checking.
 *
 * @param options - Optional configuration and callbacks.
 * @returns Payment state and methods.
 *
 * @example
 * ```tsx
 * import { usePayment } from '@alien_org/react';
 *
 * function BuyButton({ orderId }: { orderId: string }) {
 *   const {
 *     pay,
 *     isLoading,
 *     isPaid,
 *     txHash,
 *     error,
 *   } = usePayment({
 *     onPaid: (txHash) => console.log('Paid!', txHash),
 *     onCancelled: () => console.log('Cancelled'),
 *     onFailed: (code) => console.log('Failed:', code),
 *   });
 *
 *   const handleBuy = () => pay({
 *     recipient: 'wallet-address',
 *     amount: '1000000',
 *     token: 'SOL',
 *     network: 'solana',
 *     invoice: orderId,
 *     title: 'Premium Plan',
 *   });
 *
 *   if (isPaid) return <div>Thank you! TX: {txHash}</div>;
 *
 *   return (
 *     <button onClick={handleBuy} disabled={isLoading}>
 *       {isLoading ? 'Processing...' : 'Buy Now'}
 *     </button>
 *   );
 * }
 * ```
 */
export function usePayment(options: UsePaymentOptions = {}): UsePaymentReturn {
  const {
    timeout = 120000,
    onPaid,
    onCancelled,
    onFailed,
    onStatusChange,
  } = options;
  const { contractVersion, isBridgeAvailable } = useAlien();

  const callbacksRef = useRef({
    onPaid,
    onCancelled,
    onFailed,
    onStatusChange,
  });
  callbacksRef.current = { onPaid, onCancelled, onFailed, onStatusChange };

  const [state, setState] = useState<PaymentState>({ status: 'idle' });

  const supported = contractVersion
    ? isMethodSupported('payment:request', contractVersion)
    : true;

  const updateState = useCallback((newState: PaymentState) => {
    setState(newState);
    callbacksRef.current.onStatusChange?.(newState.status);
  }, []);

  const pay = useCallback(
    async (params: PaymentParams): Promise<PaymentResult> => {
      // Check bridge availability
      if (!isBridgeAvailable) {
        const error = new Error(
          'Bridge is not available. Running in dev mode?',
        );
        console.warn('[@alien_org/react]', error.message);
        const result = {
          status: 'failed' as const,
          errorCode: 'unknown' as const,
          error,
        };
        updateState(result);
        callbacksRef.current.onFailed?.('unknown', error);
        return result;
      }

      // Check version support
      if (
        contractVersion &&
        !isMethodSupported('payment:request', contractVersion)
      ) {
        const error = new MethodNotSupportedError(
          'payment:request',
          contractVersion,
          getMethodMinVersion('payment:request'),
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

      updateState({ status: 'loading' });

      try {
        const response = await request(
          'payment:request',
          params,
          'payment:response',
          { timeout },
        );

        if (response.status === 'paid') {
          const txHash = response.txHash ?? '';
          const result = { status: 'paid' as const, txHash };
          updateState(result);
          callbacksRef.current.onPaid?.(txHash);
          return result;
        }

        if (response.status === 'cancelled') {
          const result = { status: 'cancelled' as const };
          updateState(result);
          callbacksRef.current.onCancelled?.();
          return result;
        }

        // status === 'failed'
        const errorCode = response.errorCode ?? 'unknown';
        const result = { status: 'failed' as const, errorCode };
        updateState(result);
        callbacksRef.current.onFailed?.(errorCode);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (err instanceof BridgeError) {
          console.warn('[@alien_org/react] Bridge error:', err.message);
        }
        const result = {
          status: 'failed' as const,
          errorCode: 'unknown' as const,
          error,
        };
        updateState(result);
        callbacksRef.current.onFailed?.('unknown', error);
        return result;
      }
    },
    [isBridgeAvailable, contractVersion, timeout, updateState],
  );

  const reset = useCallback(() => {
    updateState({ status: 'idle' });
  }, [updateState]);

  return useMemo(
    () => ({
      status: state.status,
      isLoading: state.status === 'loading',
      isPaid: state.status === 'paid',
      isCancelled: state.status === 'cancelled',
      isFailed: state.status === 'failed',
      txHash: state.txHash,
      errorCode: state.errorCode,
      error: state.error,
      pay,
      reset,
      supported,
    }),
    [state, pay, reset, supported],
  );
}
