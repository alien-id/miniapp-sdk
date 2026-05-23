import type {
  EventName,
  EventPayload,
  MethodName,
  MethodPayload,
  MethodResponseEvent,
  RequestMethodName,
} from '@alien-id/miniapps-contract';
import {
  callability,
  type CallabilityOptions,
  callabilityError,
} from './callability';
import { BridgeError, BridgeTimeoutError } from './errors';
import { off, on } from './events';
import { getLaunchParams } from './launch-params';
import type { SafeResult } from './safe-result';
import { sendMessage } from './transport';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export interface RequestOptions {
  reqId?: string;
  timeout?: number;
}

export interface SafeRequestOptions
  extends RequestOptions,
    CallabilityOptions {}

function generateReqId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/**
 * Internal: send a request without gating on {@link callability}. Caller is
 * responsible for the Callability check. Used by `request()` (Strict Track)
 * and `request.ifAvailable()` (Safe Track) so each gate can use its own
 * version semantics (launch params vs. `options.version` override) without
 * re-gating downstream and clobbering the override.
 */
async function _requestUnchecked<M extends MethodName, E extends EventName>(
  method: M,
  params: Omit<MethodPayload<M>, 'reqId'>,
  responseEvent: E,
  options: RequestOptions = {},
): Promise<EventPayload<E>> {
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

    const handleResponse = (payload: EventPayload<E>) => {
      if (payload.reqId === reqId) {
        cleanup();
        resolve(payload);
      }
    };

    on(responseEvent, handleResponse);

    try {
      sendMessage({ type: 'method', name: method, payload });
    } catch (err) {
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Sends a request to the host app and waits for a matching response event.
 *
 * Strict Track: gates on {@link callability} and throws if the Method
 * isn't Callable. See ADR-0005.
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
async function _request<M extends RequestMethodName>(
  method: M,
  params: Omit<MethodPayload<M>, 'reqId'>,
  responseEvent: MethodResponseEvent<M>,
  options: RequestOptions = {},
): Promise<EventPayload<MethodResponseEvent<M>>> {
  const error = callabilityError(
    method,
    callability(method, { version: getLaunchParams()?.contractVersion }),
  );
  if (error) throw error;

  return _requestUnchecked(
    method,
    params,
    responseEvent as EventName,
    options,
  ) as Promise<EventPayload<MethodResponseEvent<M>>>;
}

export const request = Object.assign(_request, {
  async ifAvailable<M extends RequestMethodName>(
    method: M,
    params: Omit<MethodPayload<M>, 'reqId'>,
    responseEvent: MethodResponseEvent<M>,
    options: SafeRequestOptions = {},
  ): Promise<SafeResult<EventPayload<MethodResponseEvent<M>>, BridgeError>> {
    const gateError = callabilityError(
      method,
      callability(method, {
        version: options.version ?? getLaunchParams()?.contractVersion,
      }),
    );
    if (gateError) return { ok: false, error: gateError };

    try {
      const data = (await _requestUnchecked(
        method,
        params,
        responseEvent as EventName,
        options,
      )) as EventPayload<MethodResponseEvent<M>>;
      return { ok: true, data };
    } catch (error) {
      // Strict Track only throws BridgeError subclasses; non-bridge throws
      // from `sendMessage` (e.g., `JSON.stringify` on a cyclic payload) get
      // wrapped so the channel stays pinned to BridgeError. The original
      // error is preserved on `.cause` (ES2022 Error option) so post-mortem
      // debugging doesn't lose the root cause.
      return {
        ok: false,
        error:
          error instanceof BridgeError
            ? error
            : new BridgeError(
                error instanceof Error ? error.message : String(error),
                { cause: error },
              ),
      };
    }
  },
});
