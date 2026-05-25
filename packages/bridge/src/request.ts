import type {
  EventName,
  EventPayload,
  MethodName,
  MethodPayload,
} from '@alien-id/miniapps-contract';
import { type CallabilityOptions, gate } from './callability';
import { type BridgeError, BridgeTimeoutError, toBridgeError } from './errors';
import { off, on } from './events';
import type { SafeResult } from './safe-result';
import { sendMessage } from './transport';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export interface RequestOptions extends CallabilityOptions {
  reqId?: string;
  timeout?: number;
}

function generateReqId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/**
 * Sends a request to the host app and waits for a matching response event.
 *
 * Strict Track: gates on {@link callability} and throws if the Method
 * isn't Callable.
 *
 * Also exposes `request.ifAvailable(...)` — Safe Track variant that never
 * throws and returns a `Promise<SafeResult>` instead. Post-callability
 * failures (timeouts, host errors) also surface as `SafeResult.error`.
 *
 * @throws {BridgeUnavailableError} when the bridge isn't injected.
 * @throws {BridgeMethodUnsupportedError} when the Host's Contract Version is
 *   below the version that introduced the Method.
 * @throws {BridgeTimeoutError} when the response doesn't arrive in time.
 *
 * @example
 * ```ts
 * import { request } from '@alien-id/miniapps-bridge';
 *
 * const response = await request(
 *   'payment:request',
 *   { recipient: 'wallet-123', amount: '100', token: 'SOL', network: 'solana', invoice: 'inv-123' },
 *   'payment:response',
 * );
 *
 * const result = await request.ifAvailable(
 *   'payment:request',
 *   { recipient: 'wallet-123', amount: '100', token: 'SOL', network: 'solana', invoice: 'inv-123' },
 *   'payment:response',
 * );
 * if (!result.ok) console.warn(result.error.message);
 * ```
 */
async function _request<M extends MethodName, E extends EventName>(
  method: M,
  params: Omit<MethodPayload<M>, 'reqId'>,
  responseEvent: E,
  options: RequestOptions = {},
): Promise<EventPayload<E>> {
  const error = gate(method, options);
  if (error) throw error;

  const reqId = options.reqId || generateReqId();
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const payload = { ...params, reqId } as MethodPayload<M>;

  return new Promise<EventPayload<E>>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new BridgeTimeoutError(String(method), timeout));
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
      off(responseEvent, handleResponse);
    };

    const handleResponse = (response: EventPayload<E>) => {
      if (response.reqId === reqId) {
        cleanup();
        resolve(response);
      }
    };

    on(responseEvent, handleResponse);

    try {
      sendMessage({ type: 'method', name: method, payload });
    } catch (err) {
      cleanup();
      reject(toBridgeError(err));
    }
  });
}

export const request = Object.assign(_request, {
  async ifAvailable<M extends MethodName, E extends EventName>(
    method: M,
    params: Omit<MethodPayload<M>, 'reqId'>,
    responseEvent: E,
    options: RequestOptions = {},
  ): Promise<SafeResult<EventPayload<E>, BridgeError>> {
    try {
      const data = await _request(method, params, responseEvent, options);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: toBridgeError(err) };
    }
  },
});
