import type { Empty, WithReqId } from '../../utils';
import type { CreateMethodPayload } from '../types/payload';

/**
 * Methods interface defining all available methods and their payloads.
 * @schema
 */
export interface Methods {
  /**
   * Miniapp ready method.
   * Sent by the miniapp to notify the host app that it has loaded and is ready to be displayed.
   * @since 0.0.1
   * @schema
   */
  'app:ready': CreateMethodPayload<Empty>;
  /**
   * Miniapp close acknowledgment method.
   * Sent by the miniapp to notify the host app that it has completed cleanup and is ready to be closed.
   * Note that if the miniapp takes longer than 10 seconds to close, the host app will force close the miniapp.
   * @since 0.0.14
   * @schema
   */
  'miniapp:close.ack': CreateMethodPayload<Empty>;
  /**
   * Toggle host app's back button visibility.
   * @since 0.0.14
   * @schema
   */
  'host.back.button:toggle': CreateMethodPayload<{
    /**
     * Whether to show or hide the back button.
     * @since 0.0.14
     * @schema
     */
    visible: boolean;
  }>;
  /**
   * Request a payment from the user.
   *
   * The `invoice` field is your order/invoice ID for backend correlation.
   * Your backend receives a webhook when user pays - fulfill the order
   * immediately without waiting for chain confirmation.
   *
   * Optional display fields (`title`, `caption`, `iconUrl`, `quantity`)
   * are shown on the payment approval screen.
   *
   * Set `test: true` for test mode - no real payment is made, but webhooks
   * are fired with `test: true` flag. Use for development and testing.
   *
   * @since 0.1.1
   * @schema
   */
  'payment:request': CreateMethodPayload<
    WithReqId<{
      /**
       * The recipient's wallet address.
       * @since 0.1.1
       * @schema
       */
      recipient: string;
      /**
       * The amount to pay (in token's smallest unit, as string for precision).
       * @since 0.1.1
       * @schema
       */
      amount: string;
      /**
       * The token identifier (e.g., 'SOL', 'ALIEN', or contract address).
       * @since 0.1.1
       * @schema
       */
      token: string;
      /**
       * The network for the payment ('solana' or 'alien').
       * @since 0.1.1
       * @schema
       */
      network: string;
      /**
       * Your order/invoice ID for backend correlation and instant fulfillment.
       * @since 0.1.1
       * @schema
       */
      invoice: string;
      /**
       * Item title shown on the approval screen.
       * @since 0.1.1
       * @schema
       */
      title?: string;
      /**
       * Item description/caption shown on the approval screen.
       * @since 0.1.1
       * @schema
       */
      caption?: string;
      /**
       * Item icon URL shown on the approval screen.
       * @since 0.1.1
       * @schema
       */
      iconUrl?: string;
      /**
       * Quantity of items being purchased.
       * @since 0.1.1
       * @schema
       */
      quantity?: number;
      /**
       * Test mode flag. When true, no real payment is processed.
       * The approval screen shows a test indicator, and webhooks
       * include `test: true`. Use for development and testing.
       * @since 0.1.1
       * @schema
       */
      test?: boolean;
    }>
  >;
  /**
   * Write text to the system clipboard.
   * @since 0.1.1
   * @schema
   */
  'clipboard:write': CreateMethodPayload<{
    /**
     * Text to copy to clipboard.
     * @since 0.1.1
     * @schema
     */
    text: string;
  }>;
  /**
   * Read text from the system clipboard.
   * @since 0.1.1
   * @schema
   */
  'clipboard:read': CreateMethodPayload<WithReqId<Empty>>;
}
