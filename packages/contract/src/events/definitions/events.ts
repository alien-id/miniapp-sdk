import type { Empty, PaymentErrorCode, WithReqId } from '../../utils';
import type { CreateEventPayload } from '../types/payload';

/**
 * Events interface defining all available events and their payloads.
 * @since 0.0.1
 * @schema
 */
export interface Events {
  /**
   * Miniapp close event, fired by the host app just before the miniapp is closed.
   * @since 0.0.14
   * @schema
   */
  'miniapp:close': CreateEventPayload<Empty>;
  /**
   * Host app's back button clicked event.
   * @since 0.0.14
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
}
