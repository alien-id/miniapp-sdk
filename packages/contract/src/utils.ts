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

/**
 * Haptic impact feedback styles.
 * Maps to UIImpactFeedbackGenerator styles on iOS
 * and VibrationEffect on Android.
 * @since 0.2.4
 * @schema
 */
export type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';

/**
 * Haptic notification feedback types.
 * Maps to UINotificationFeedbackGenerator types on iOS.
 * @since 0.2.4
 * @schema
 */
export type HapticNotificationType = 'success' | 'warning' | 'error';

/**
 * Solana wallet error codes (WalletConnect-compatible numeric codes).
 *
 * These codes are identical to WalletConnect JSON-RPC error codes,
 * so the mobile app produces the same `(code, message)` pair for
 * both bridge and relay transports — no mapping needed.
 *
 * | Code | Meaning | WC Name |
 * |------|---------|---------|
 * | `5000` | User rejected the request | `userRejected` |
 * | `-32602` | Invalid params (malformed transaction, bad input) | JSON-RPC standard |
 * | `-32603` | Internal error (send failed, unexpected error) | JSON-RPC standard |
 * | `8000` | Request expired / timed out | `sessionRequestExpired` |
 *
 * @since 0.3.0
 * @schema
 */
export type WalletSolanaErrorCode = 5000 | -32602 | -32603 | 8000;

/**
 * Named constants for {@link WalletSolanaErrorCode}.
 *
 * @example
 * ```ts
 * import { WALLET_ERROR } from '@alien_org/contract';
 *
 * if (response.errorCode === WALLET_ERROR.USER_REJECTED) {
 *   // user cancelled
 * }
 * ```
 *
 * @since 0.3.0
 */
export const WALLET_ERROR = {
  /** User rejected the request (cancelled approval screen). */
  USER_REJECTED: 5000,
  /** Invalid params — transaction deserialization failed, malformed input. */
  INVALID_PARAMS: -32602,
  /** Internal error — transaction broadcast failed, unexpected error. */
  INTERNAL_ERROR: -32603,
  /** Request expired before the user responded. */
  REQUEST_EXPIRED: 8000,
} as const;

/**
 * Solana commitment levels for send options.
 * @since 0.3.0
 * @schema
 */
export type SolanaCommitment = 'processed' | 'confirmed' | 'finalized';

/**
 * Solana chain identifiers (wallet-standard format).
 * Used by `wallet.solana:sign.send` to tell the host app
 * which cluster to broadcast to.
 * @since 0.3.0
 * @schema
 */
export type SolanaChain = 'solana:mainnet' | 'solana:devnet' | 'solana:testnet';
