import type { MethodName, MethodPayload } from '@alien-id/miniapps-contract';
import { type CallabilityOptions, gate } from './callability';
import { type BridgeError, toBridgeError } from './errors';
import type { SafeResult } from './safe-result';
import { sendMessage } from './transport';

/**
 * Sends a one-way method to the host app. Use for fire-and-forget methods
 * like 'app:ready'.
 *
 * Strict Track: gates on {@link callability} and throws if the Method
 * isn't Callable.
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
  const error = gate(method);
  if (error) throw error;
  sendMessage({ type: 'method', name: method, payload });
}

export const send = Object.assign(_send, {
  ifAvailable<M extends MethodName>(
    method: M,
    payload: MethodPayload<M>,
    options?: CallabilityOptions,
  ): SafeResult<void, BridgeError> {
    const error = gate(method, options);
    if (error) return { ok: false, error };

    try {
      sendMessage({ type: 'method', name: method, payload });
      return { ok: true, data: undefined };
    } catch (err) {
      return { ok: false, error: toBridgeError(err) };
    }
  },
});
