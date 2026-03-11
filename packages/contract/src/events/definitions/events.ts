import type {
  Empty,
  PaymentErrorCode,
  WalletSolanaErrorCode,
  WithReqId,
} from '../../utils';
import type { CreateEventPayload } from '../types/payload';

/** JSON-RPC 2.0 error payload for wallet responses. */
export type WalletError = {
  /** Numeric error code. See {@link WalletSolanaErrorCode}. */
  code: WalletSolanaErrorCode;
  /** Human-readable error description. */
  message: string;
  /** Optional structured error details. */
  data?: Record<string, unknown>;
};

/**
 * JSON-RPC 2.0 aligned wallet response envelope (discriminated union).
 * Exactly one of `result` or `error` is present — never both, never neither.
 * @since 1.0.0
 * @schema
 */
type WalletResponse<TResult> = WithReqId<
  | { /** Success payload. */ result: TResult; error?: never }
  | { result?: never /** Error payload. */; error: WalletError }
>;

/**
 * Events interface defining all available events and their payloads.
 * @since 0.0.1
 * @schema
 */
export interface Events {
  /**
   * Host app's back button clicked event.
   * @since 1.0.0
   * @schema
   */
  'host.back.button:clicked': CreateEventPayload<Empty>;
  /**
   * Payment response event.
   *
   * Statuses:
   * - `paid`: Payment successful, `txHash` included
   * - `cancelled`: User manually cancelled/rejected the payment
   * - `failed`: Error occurred (see `errorCode` for details)
   *
   * For instant fulfillment, your backend should fulfill on webhook receipt
   * using the `invoice` from the request.
   *
   * @since 0.1.1
   * @schema
   */
  'payment:response': CreateEventPayload<
    WithReqId<{
      /**
       * Payment status.
       * - `paid`: Success
       * - `cancelled`: User rejected
       * - `failed`: Sending transaction failed (check `errorCode`)
       * @since 0.1.1
       * @schema
       */
      status: 'paid' | 'cancelled' | 'failed';
      /**
       * Transaction hash (present when status is 'paid').
       * @since 0.1.1
       * @schema
       */
      txHash?: string;
      /**
       * Error code (present when status is 'failed').
       * - `insufficient_balance`: User doesn't have enough tokens
       * - `network_error`: Blockchain network issue
       * - `unknown`: Unexpected error
       * @since 0.1.1
       * @schema
       */
      errorCode?: PaymentErrorCode;
    }>
  >;
  /**
   * Clipboard read response.
   *
   * On success: `text` contains the clipboard content (may be empty string).
   * On failure: `text` is null and `errorCode` indicates the reason.
   *
   * @since 0.1.1
   * @schema
   */
  'clipboard:response': CreateEventPayload<
    WithReqId<{
      /**
       * Text from clipboard. Null if read failed.
       * @since 0.1.1
       * @schema
       */
      text: string | null;
      /**
       * Error code if clipboard read failed.
       * - `permission_denied`: User denied clipboard access
       * - `unavailable`: Clipboard is not available
       * @since 0.1.1
       * @schema
       */
      errorCode?: 'permission_denied' | 'unavailable';
    }>
  >;
  /**
   * Solana wallet connection response.
   * Uses JSON-RPC 2.0 aligned `result`/`error` envelope.
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:connect.response': CreateEventPayload<
    WalletResponse<{
      /** Base58-encoded public key of the connected wallet */
      publicKey: string;
    }>
  >;
  /**
   * Solana transaction signing response.
   * Uses JSON-RPC 2.0 aligned `result`/`error` envelope.
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:sign.transaction.response': CreateEventPayload<
    WalletResponse<{
      /** Base64-encoded signed transaction */
      signedTransaction: string;
    }>
  >;
  /**
   * Solana message signing response.
   * Uses JSON-RPC 2.0 aligned `result`/`error` envelope.
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:sign.message.response': CreateEventPayload<
    WalletResponse<{
      /** Base58-encoded Ed25519 signature (64 bytes) */
      signature: string;
      /** Base58-encoded public key that produced the signature */
      publicKey: string;
    }>
  >;
  /**
   * Solana sign-and-send transaction response.
   * Uses JSON-RPC 2.0 aligned `result`/`error` envelope.
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:sign.send.response': CreateEventPayload<
    WalletResponse<{
      /** Base58-encoded transaction signature */
      signature: string;
    }>
  >;
}
