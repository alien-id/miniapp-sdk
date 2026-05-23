import type { EventName } from '../../events/types/event-types';
import type { MethodName } from './method-types';

/**
 * Static mapping from request methods to their response event.
 *
 * Exhaustive over every `MethodName`. Every method declared in
 * `Methods` must appear here — either pointing to an `EventName` (the
 * response event) or `never` (fire-and-forget). If a method is added
 * to `Methods` without a matching entry, the `satisfies` clause below
 * fails to type-check, surfacing the omission at the source level
 * instead of silently widening the new method's response event to
 * `EventName`.
 */
const METHOD_RESPONSE_EVENTS = {
  'app:ready': undefined as never,
  'app:close': undefined as never,
  'host.back.button:toggle': undefined as never,
  'clipboard:write': undefined as never,
  'link:open': undefined as never,
  'haptic:impact': undefined as never,
  'haptic:notification': undefined as never,
  'haptic:selection': undefined as never,
  'wallet.solana:disconnect': undefined as never,
  'payment:request': 'payment:response',
  'clipboard:read': 'clipboard:response',
  'wallet.solana:connect': 'wallet.solana:connect.response',
  'wallet.solana:sign.transaction': 'wallet.solana:sign.transaction.response',
  'wallet.solana:sign.message': 'wallet.solana:sign.message.response',
  'wallet.solana:sign.send': 'wallet.solana:sign.send.response',
  'notifications:permission.request': 'notifications:permission.response',
} as const satisfies { [M in MethodName]: EventName | never };

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
export type MethodResponseEvent<M extends MethodName> = MethodResponseEvents[M];

/**
 * Methods that expect a response event (request-response methods).
 */
export type RequestMethodName = {
  [M in MethodName]: [MethodResponseEvent<M>] extends [never] ? never : M;
}[MethodName];
