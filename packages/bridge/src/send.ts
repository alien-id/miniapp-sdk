import type { MethodName, MethodPayload } from '@alien-id/miniapps-contract';
import { callability, callabilityError } from './callability';
import { BridgeError } from './errors';
import { getLaunchParams } from './launch-params';
import type { AvailabilityOptions, SafeResult } from './safe-result';
import { sendMessage } from './transport';

/**
 * Sends a one-way method to the host app. Use for fire-and-forget methods
 * like 'app:ready'.
 *
 * Strict Track: gates on {@link callability} and throws if the Method
 * isn't Callable. See ADR-0005.
 *
 * Also exposes `send.ifAvailable(...)` — Safe Track variant that never
 * throws and returns a {@link SafeResult} instead.
 *
 * @throws {BridgeUnavailableError} when the bridge isn't injected.
 * @throws {BridgeMethodUnsupportedError} when the Host's Contract Version is
 *   below the version that introduced the Method.
 *
 * @example
 * ```ts
 * import { send } from '@alien-id/miniapps-bridge';
 *
 * send('app:ready', {});
 *
 * const result = send.ifAvailable('haptic:impact', { style: 'medium' });
 * if (!result.ok) console.warn(result.error.message);
 * ```
 */
function _send<M extends MethodName>(
  method: M,
  payload: MethodPayload<M>,
): void {
  const error = callabilityError(
    method,
    callability(method, { version: getLaunchParams()?.contractVersion }),
  );
  if (error) throw error;
  sendMessage({ type: 'method', name: method, payload });
}

export const send = Object.assign(_send, {
  ifAvailable<M extends MethodName>(
    method: M,
    payload: MethodPayload<M>,
    options?: AvailabilityOptions,
  ): SafeResult<void, BridgeError> {
    const gateError = callabilityError(
      method,
      callability(method, {
        version: options?.version ?? getLaunchParams()?.contractVersion,
      }),
    );
    if (gateError) return { ok: false, error: gateError };

    try {
      sendMessage({ type: 'method', name: method, payload });
      return { ok: true, data: undefined };
    } catch (error) {
      // sendMessage throws BridgeUnavailable/Window errors; anything else
      // (e.g., JSON.stringify on a cyclic payload) gets wrapped so callers
      // can rely on the channel being a BridgeError.
      return {
        ok: false,
        error:
          error instanceof BridgeError
            ? error
            : new BridgeError(
                error instanceof Error ? error.message : String(error),
              ),
      };
    }
  },
});
