import type { MethodName, MethodPayload } from '@alien_org/contract';
import { sendMessage } from './transport';

/**
 * Sends a one-way method to the host app without waiting for a response.
 * Use this for fire-and-forget methods like 'app:ready'.
 *
 * @param method - The method name to send
 * @param payload - The method payload
 *
 * @example
 * ```ts
 * import { send } from '@alien_org/bridge';
 *
 * send('app:ready', {});
 * ```
 */
export function send<M extends MethodName>(
  method: M,
  payload: MethodPayload<M>,
): void {
  sendMessage({
    type: 'method',
    name: method,
    payload,
  });
}
