import type {
  EventName,
  EventPayload,
  MethodName,
  MethodPayload,
} from '@alien-id/miniapps-contract';
import type { RequestOptions } from './request';
import { request } from './request';
import type { AvailabilityOptions, SafeResult } from './safe-result';
import { checkAvailability } from './safe-result';

export interface SafeRequestOptions
  extends RequestOptions,
    AvailabilityOptions {}

/**
 * Safe version of `request()` that never throws.
 * Returns a `Promise<SafeResult<EventPayload<E>>>` instead of throwing on failure.
 *
 * @param method - The method name to send
 * @param params - The method payload (without reqId)
 * @param responseEvent - The event to wait for as response
 * @param options - Request options extended with availability options
 * @returns A Promise resolving to a SafeResult
 *
 * @example
 * ```ts
 * import { requestIfAvailable } from '@alien-id/miniapps-bridge';
 *
 * const result = await requestIfAvailable(
 *   'payment:request',
 *   { recipient: 'wallet-123', amount: '100', token: 'SOL', network: 'solana', invoice: 'inv-123' },
 *   'payment:response',
 * );
 * if (result.ok) {
 *   console.log('Payment:', result.data.status);
 * } else {
 *   console.warn('Failed:', result.error.message);
 * }
 * ```
 */
export async function requestIfAvailable<
  M extends MethodName,
  E extends EventName,
>(
  method: M,
  params: Omit<MethodPayload<M>, 'reqId'>,
  responseEvent: E,
  options: SafeRequestOptions = {},
): Promise<SafeResult<EventPayload<E>>> {
  const unavailable = checkAvailability(method, options);
  if (unavailable) return unavailable;

  try {
    const data = await request(method, params, responseEvent, options);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
