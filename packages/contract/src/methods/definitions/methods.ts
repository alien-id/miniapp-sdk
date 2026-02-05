import type { Empty, PaymentTestScenario, WithReqId } from '../../utils';
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
   * Set `test` to a scenario string (e.g. `'paid'`, `'error:insufficient_balance'`)
   * for test mode - no real payment is made, but the specified scenario is
   * simulated. Use for development and testing.
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
       * Optional item details shown on the approval screen.
       * @since 0.1.1
       * @schema
       */
      item?: {
        /**
         * Item title shown on the approval screen.
         * @since 0.1.1
         * @schema
         */
        title: string;
        /**
         * Item icon URL shown on the approval screen.
         * @since 0.1.1
         * @schema
         */
        iconUrl: string;
        /**
         * Quantity of items being purchased.
         * @since 0.1.1
         * @schema
         */
        quantity: number;
      };
      /**
       * Test mode. Simulates payment outcomes without real transactions.
       *
       * | Scenario | Client | Webhook |
       * |----------|--------|---------|
       * | `'paid'` | `paid` | `finalized` |
       * | `'paid:failed'` | `paid` | `failed` |
       * | `'cancelled'` | `cancelled` | none |
       * | `'error:*'` | `failed` | none |
       *
       * **Pre-broadcast errors** (no webhook):
       * `'error:insufficient_balance'`, `'error:network_error'`,
       * `'error:pre_checkout_rejected'`, `'error:pre_checkout_timeout'`,
       * `'error:unknown'`
       *
       * @example
       * // Happy path
       * test: 'paid'
       *
       * // Client shows success, but tx failed on-chain
       * test: 'paid:failed'
       *
       * // User cancelled
       * test: 'cancelled'
       *
       * // Pre-broadcast failure
       * test: 'error:insufficient_balance'
       *
       * @since 0.1.1
       * @schema
       */
      test?: PaymentTestScenario;
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
  /**
   * Open a URL.
   *
   * The host app acts as middleware: parses the URL, checks permissions/auth,
   * and routes to the appropriate handler based on URL and `openMode`.
   *
   * **`external`** (default) - Open outside the host app:
   * - Custom schemes (`solana:`, `mailto:`) → system handler
   * - HTTPS → system browser
   *
   * **`internal`** - Open within the host app:
   * - Miniapp links → open miniapp (handles auth if required)
   * - Other links → in-app webview
   *
   * @example
   * emit('link:open', { url: 'solana:...' });
   * emit('link:open', { url: 'mailto:hi@example.com' });
   * emit('link:open', { url: 'https://example.com', openMode: 'internal' });
   *
   * @since 0.1.3
   * @schema
   */
  'link:open': CreateMethodPayload<{
    /**
     * The URL to open.
     * @since 0.1.3
     * @schema
     */
    url: string;
    /**
     * Where to open the URL.
     * - `external` (default): System browser or app handler
     * - `internal`: Within the host app (miniapps, webviews)
     * @since 0.1.3
     * @schema
     */
    openMode?: 'external' | 'internal';
  }>;
}
