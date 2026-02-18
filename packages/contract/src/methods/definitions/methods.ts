import type {
  Empty,
  HapticImpactStyle,
  HapticNotificationType,
  PaymentTestScenario,
  SolanaChain,
  SolanaCommitment,
  WithReqId,
} from '../../utils';
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
  /**
   * Trigger haptic impact feedback.
   * Fire-and-forget — no response expected.
   * @since 0.2.4
   * @schema
   */
  'haptic:impact': CreateMethodPayload<{
    /**
     * The impact feedback style.
     * @since 0.2.4
     * @schema
     */
    style: HapticImpactStyle;
  }>;
  /**
   * Trigger haptic notification feedback.
   * Fire-and-forget — no response expected.
   * @since 0.2.4
   * @schema
   */
  'haptic:notification': CreateMethodPayload<{
    /**
     * The notification feedback type.
     * @since 0.2.4
     * @schema
     */
    type: HapticNotificationType;
  }>;
  /**
   * Trigger haptic selection change feedback.
   * Fire-and-forget — no response expected.
   * @since 0.2.4
   * @schema
   */
  'haptic:selection': CreateMethodPayload<Empty>;
  /**
   * Request Solana wallet connection.
   * Returns the wallet's public key on success.
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:connect': CreateMethodPayload<WithReqId<Empty>>;
  /**
   * Disconnect from Solana wallet.
   * Fire-and-forget — no response expected.
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:disconnect': CreateMethodPayload<Empty>;
  /**
   * Request Solana transaction signing.
   * Returns the signed transaction bytes.
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:sign.transaction': CreateMethodPayload<
    WithReqId<{
      /** Base64-encoded serialized transaction (legacy or versioned) */
      transaction: string;
    }>
  >;
  /**
   * Request Solana message signing.
   * Returns the Ed25519 signature.
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:sign.message': CreateMethodPayload<
    WithReqId<{
      /** Base58-encoded message bytes */
      message: string;
    }>
  >;
  /**
   * Request Solana transaction signing and sending.
   * The host app signs and broadcasts the transaction.
   * Returns the transaction signature.
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:sign.send': CreateMethodPayload<
    WithReqId<{
      /** Base64-encoded serialized transaction (legacy or versioned) */
      transaction: string;
      /**
       * Target Solana cluster for broadcasting.
       * In bridge mode the host app can infer this from miniapp config,
       * but in relay mode (QR/WebSocket) this is required so the host
       * app knows which RPC to broadcast to.
       * @since 1.0.0
       * @schema
       */
      chain?: SolanaChain;
      /** Optional send options */
      options?: {
        skipPreflight?: boolean;
        preflightCommitment?: SolanaCommitment;
        /** Desired commitment level for transaction confirmation. */
        commitment?: SolanaCommitment;
        /**
         * The minimum slot that the request can be evaluated at.
         * Ensures the read is not served by a node lagging behind.
         */
        minContextSlot?: number;
        maxRetries?: number;
      };
    }>
  >;
  /**
   * Request fullscreen mode.
   * Fire-and-forget — host app responds with `fullscreen:changed` or `fullscreen:failed` event.
   *
   * @example
   * send('fullscreen:request', {});
   *
   * @since 1.1.0
   * @schema
   */
  'fullscreen:request': CreateMethodPayload<Empty>;
  /**
   * Exit fullscreen mode.
   * Fire-and-forget — host app responds with `fullscreen:changed` event.
   *
   * @example
   * send('fullscreen:exit', {});
   *
   * @since 1.1.0
   * @schema
   */
  'fullscreen:exit': CreateMethodPayload<Empty>;
}
