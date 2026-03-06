import type { MethodName, MethodPayload } from '@alien_org/contract';
import type { AvailabilityOptions, SafeResult } from './safe-result';
import { checkAvailability } from './safe-result';
import { send } from './send';

/**
 * Safe version of `send()` that never throws.
 * Returns a `SafeResult<void>` instead of throwing on failure.
 *
 * @param method - The method name to send
 * @param payload - The method payload
 * @param options - Optional availability options (version check)
 * @returns A SafeResult indicating success or failure
 *
 * @example
 * ```ts
 * import { sendIfAvailable } from '@alien_org/bridge';
 *
 * const result = sendIfAvailable('haptic:impact', { style: 'medium' });
 * if (!result.ok) {
 *   console.warn('Could not send:', result.error.message);
 * }
 * ```
 */
export function sendIfAvailable<M extends MethodName>(
  method: M,
  payload: MethodPayload<M>,
  options?: AvailabilityOptions,
): SafeResult<void> {
  const unavailable = checkAvailability(method, options);
  if (unavailable) return unavailable;

  try {
    send(method, payload);
    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
