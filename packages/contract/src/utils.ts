/**
 * Adds a reqId field to the payload.
 * @schema
 */
export type WithReqId<T> = T & {
  /**
   * Request identifier.
   * @schema
   */
  reqId: string;
};

/**
 * Semantic versioning type.
 * @example
 * type Version = '1.0.0';
 */
export type Version = `${number}.${number}.${number}`;

/**
 * Extracts keys, that are present in the type if it is an object.
 * @example
 * type Keys = UnionKeys<{ a: string, b: number }>;
 * // Keys = 'a' | 'b'
 */
export type UnionKeys<T> = T extends T ? keyof T : never;

/**
 * Checks if a type is never.
 * @example
 * type IsNever = IsNever<never>;
 * // IsNever = true
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Conditional type.
 * @example
 * type If = If<true, 'true', 'false'>;
 * // If = 'true'
 */
export type If<Cond extends boolean, True, False> = Cond extends true
  ? True
  : False;

/**
 * Logical OR type.
 * @example
 * type Or = Or<true, false>;
 * // Or = true
 */
export type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true
    ? true
    : false;

/**
 * Empty object type.
 * @example
 * type Empty = Empty;
 * // Empty = {}
 */
export type Empty = Record<string, never>;

/**
 * Client-side payment error codes (pre-broadcast failures).
 * Returned when `status` is `'failed'` in `payment:response`.
 * These errors occur before transaction broadcast, so no webhook is sent.
 * @since 0.1.1
 * @schema
 */
export type PaymentErrorCode =
  | 'insufficient_balance'
  | 'network_error'
  | 'pre_checkout_rejected'
  | 'pre_checkout_timeout'
  | 'unknown';

/**
 * Webhook status for payment results (on-chain truth).
 * - `'finalized'`: Transaction confirmed on-chain
 * - `'failed'`: Transaction failed on-chain
 * @since 0.1.2
 * @schema
 */
export type PaymentWebhookStatus = 'finalized' | 'failed';

/**
 * Payment test scenarios for simulating different payment outcomes.
 *
 * | Scenario | Client sees | Webhook |
 * |----------|-------------|---------|
 * | `'paid'` | `paid` | `{ status: 'finalized' }` |
 * | `'paid:failed'` | `paid` | `{ status: 'failed' }` |
 * | `'cancelled'` | `cancelled` | none |
 * | `'error:*'` | `failed` | none (pre-broadcast) |
 *
 * @example
 * // Happy path: client paid, tx finalized
 * test: 'paid'
 *
 * // On-chain failure: client paid, tx failed
 * test: 'paid:failed'
 *
 * // User cancelled before confirming
 * test: 'cancelled'
 *
 * // Pre-broadcast error (no tx, no webhook)
 * test: 'error:insufficient_balance'
 *
 * @since 0.1.2
 * @schema
 */
export type PaymentTestScenario =
  | 'paid'
  | 'paid:failed'
  | 'cancelled'
  | `error:${PaymentErrorCode}`;
