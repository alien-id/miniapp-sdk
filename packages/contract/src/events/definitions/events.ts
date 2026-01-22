import type { Empty, WithReqId } from '../../utils';
import type { CreateEventPayload } from '../types/payload';

/**
 * Events interface defining all available events and their payloads.
 * @since 0.0.1
 * @schema
 */
export interface Events {
  /**
   * Authentication initialization response event with token.
   * @since 0.0.1
   * @schema
   */
  'auth.init:response.token': CreateEventPayload<
    WithReqId<{
      /**
       * Authentication token.
       * @since 0.0.1
       * @schema
       */
      token: string;
    }>
  >;
  /**
   * Ping response event for testing communication.
   * @since 0.0.1
   * @schema
   */
  'ping:response': CreateEventPayload<
    WithReqId<{
      /**
       * Echoed message from the ping request.
       * @since 0.0.1
       * @schema
       */
      message: string;
      /**
       * Timestamp when the ping was processed.
       * @since 0.0.1
       * @schema
       */
      timestamp: string;
    }>
  >;
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
   * @since 0.0.14
   * @schema
   */
  'payment:response': CreateEventPayload<
    WithReqId<{
      /**
       * Payment status.
       * - `paid`: Success
       * - `cancelled`: User rejected
       * - `failed`: Error (check `errorCode`)
       * @since 0.0.14
       * @schema
       */
      status: 'paid' | 'cancelled' | 'failed';
      /**
       * Transaction hash (present when status is 'paid').
       * @since 0.0.14
       * @schema
       */
      txHash?: string;
      /**
       * Error code (present when status is 'failed').
       * - `insufficient_balance`: User doesn't have enough tokens
       * - `network_error`: Blockchain network issue
       * - `pre_checkout_rejected`: Backend rejected the payment in pre-checkout
       * - `pre_checkout_timeout`: Backend didn't respond to pre-checkout in time
       * - `unknown`: Unexpected error
       * @since 0.0.14
       * @schema
       */
      errorCode?:
        | 'insufficient_balance'
        | 'network_error'
        | 'pre_checkout_rejected'
        | 'pre_checkout_timeout'
        | 'unknown';
    }>
  >;
}
