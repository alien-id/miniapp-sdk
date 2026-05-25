import type { EventName } from '../../events/types/event-types';
import type { MethodName } from './method-types';

/**
 * Canonical method → response-event map.
 *
 * Single source of truth for two related questions:
 *   1. Which methods are request-response? (entry has a string value)
 *   2. Which event does each request method's response carry? (the value)
 *
 * Fire-and-forget methods are tagged with `undefined` and surface as
 * `never` in {@link MethodResponseEvent}. Every method declared in the
 * `Methods` interface must appear here — the `satisfies` clause makes
 * the omission a compile error at the source.
 *
 * Consumers should not import this constant directly. Use
 * {@link METHOD_NAMES}, {@link REQUEST_METHOD_NAMES},
 * {@link FIRE_AND_FORGET_METHOD_NAMES}, or {@link getResponseEvent}
 * instead — those preserve the type-level guarantees while exposing a
 * sane runtime shape (no `undefined as never` surprises).
 */
const METHOD_RESPONSE_EVENTS = {
  'app:ready': undefined,
  'app:close': undefined,
  'host.back.button:toggle': undefined,
  'clipboard:write': undefined,
  'link:open': undefined,
  'haptic:impact': undefined,
  'haptic:notification': undefined,
  'haptic:selection': undefined,
  'wallet.solana:disconnect': undefined,
  'payment:request': 'payment:response',
  'clipboard:read': 'clipboard:response',
  'wallet.solana:connect': 'wallet.solana:connect.response',
  'wallet.solana:sign.transaction': 'wallet.solana:sign.transaction.response',
  'wallet.solana:sign.message': 'wallet.solana:sign.message.response',
  'wallet.solana:sign.send': 'wallet.solana:sign.send.response',
  'notifications:permission.request': 'notifications:permission.response',
} as const satisfies { [M in MethodName]: EventName | undefined };

/**
 * Static map from request methods to their response event. Derived from
 * the `satisfies`-validated runtime constant above, so it stays
 * exhaustive over `MethodName` by construction.
 */
export type MethodResponseEvents = {
  readonly [M in MethodName]: (typeof METHOD_RESPONSE_EVENTS)[M];
};

/**
 * Response event for a request method. `never` when the method is
 * fire-and-forget.
 */
export type MethodResponseEvent<M extends MethodName> =
  MethodResponseEvents[M] extends EventName ? MethodResponseEvents[M] : never;

/**
 * Methods that expect a response event (request-response methods).
 */
export type RequestMethodName = {
  [M in MethodName]: [MethodResponseEvent<M>] extends [never] ? never : M;
}[MethodName];

/**
 * Methods that do not expect a response (fire-and-forget).
 */
export type FireAndForgetMethodName = Exclude<MethodName, RequestMethodName>;

/**
 * Runtime list of every method declared in the `Methods` interface.
 *
 * TypeScript types are erased at runtime, so this constant is the only
 * honest way to enumerate them. Iterate this when writing tests or
 * tooling that needs to cover every method.
 */
export const METHOD_NAMES: readonly MethodName[] = Object.keys(
  METHOD_RESPONSE_EVENTS,
) as MethodName[];

/**
 * Runtime list of every request-response method. Partitioned from
 * {@link METHOD_NAMES} by the presence of a response event.
 */
export const REQUEST_METHOD_NAMES: readonly RequestMethodName[] =
  METHOD_NAMES.filter(
    (m): m is RequestMethodName =>
      METHOD_RESPONSE_EVENTS[m as keyof typeof METHOD_RESPONSE_EVENTS] !==
      undefined,
  );

/**
 * Runtime list of every fire-and-forget method. Partitioned from
 * {@link METHOD_NAMES} by the absence of a response event.
 */
export const FIRE_AND_FORGET_METHOD_NAMES: readonly FireAndForgetMethodName[] =
  METHOD_NAMES.filter(
    (m): m is FireAndForgetMethodName =>
      METHOD_RESPONSE_EVENTS[m as keyof typeof METHOD_RESPONSE_EVENTS] ===
      undefined,
  );

/**
 * Resolve the response event for a request method.
 *
 * Typed so the returned event narrows to the precise literal for the
 * given method (e.g. `'payment:request'` → `'payment:response'`).
 */
export function getResponseEvent<M extends RequestMethodName>(
  method: M,
): MethodResponseEvent<M> {
  return METHOD_RESPONSE_EVENTS[method] as MethodResponseEvent<M>;
}
