import type {
  Empty,
  LocationErrorCode,
  NotificationPermissionStatus,
  PaymentErrorCode,
  WalletSolanaErrorCode,
  WithReqId,
} from '../../utils';
import type { CreateEventPayload } from '../types/payload';

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
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:connect.response': CreateEventPayload<
    WithReqId<{
      /** Base58-encoded public key of the connected wallet */
      publicKey?: string;
      /** Numeric error code (WalletConnect-compatible). See {@link WalletSolanaErrorCode}. */
      errorCode?: WalletSolanaErrorCode;
      /** Human-readable error description */
      errorMessage?: string;
    }>
  >;
  /**
   * Solana transaction signing response.
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:sign.transaction.response': CreateEventPayload<
    WithReqId<{
      /** Base64-encoded signed transaction */
      signedTransaction?: string;
      /** Numeric error code (WalletConnect-compatible). See {@link WalletSolanaErrorCode}. */
      errorCode?: WalletSolanaErrorCode;
      /** Human-readable error description */
      errorMessage?: string;
    }>
  >;
  /**
   * Solana message signing response.
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:sign.message.response': CreateEventPayload<
    WithReqId<{
      /** Base58-encoded Ed25519 signature (64 bytes) */
      signature?: string;
      /** Base58-encoded public key that signed the message */
      publicKey?: string;
      /** Numeric error code (WalletConnect-compatible). See {@link WalletSolanaErrorCode}. */
      errorCode?: WalletSolanaErrorCode;
      /** Human-readable error description */
      errorMessage?: string;
    }>
  >;
  /**
   * Solana sign-and-send transaction response.
   * @since 1.0.0
   * @schema
   */
  'wallet.solana:sign.send.response': CreateEventPayload<
    WithReqId<{
      /** Base58-encoded transaction signature */
      signature?: string;
      /** Numeric error code (WalletConnect-compatible). See {@link WalletSolanaErrorCode}. */
      errorCode?: WalletSolanaErrorCode;
      /** Human-readable error description */
      errorMessage?: string;
    }>
  >;
  /**
   * Notification permission response.
   *
   * Statuses (Phase 1):
   * - `granted`: User allowed notifications for this miniapp.
   * - `denied`: User dismissed the consent prompt.
   * - `rate_limited`: Host suppressed the prompt; budget exhausted.
   *
   * `prompt` is never returned — the request either short-circuits from
   * stored consent or resolves the drawer to granted/denied.
   *
   * @since 1.5.0
   * @schema
   */
  'notifications:permission.response': CreateEventPayload<
    WithReqId<{
      /**
       * Resolved permission status.
       * @since 1.5.0
       * @schema
       */
      status: NotificationPermissionStatus;
    }>
  >;
  /**
   * Location response for `location:request`.
   *
   * On success: position fields are present and `errorCode` is absent.
   * On failure: position fields are absent and `errorCode` indicates why.
   *
   * Field shape follows native CLLocation / android.location.Location
   * (accuracy split into horizontal/vertical/heading/speed). `latitude`,
   * `longitude` and `horizontalAccuracy` are always present on success; the
   * rest are `null` when the device can't provide them.
   *
   * @since 1.6.0
   * @schema
   */
  'location:response': CreateEventPayload<
    WithReqId<{
      // --- Position (always present on success) ---
      /**
       * Latitude in decimal degrees (WGS84). Present on success.
       * @since 1.6.0
       * @schema
       */
      latitude?: number;
      /**
       * Longitude in decimal degrees (WGS84). Present on success.
       * @since 1.6.0
       * @schema
       */
      longitude?: number;

      // --- Motion & elevation (null when the device can't provide them) ---
      /**
       * Altitude in meters above the WGS84 ellipsoid, or `null`. iOS host
       * must use `ellipsoidalAltitude` (not `altitude`, which is
       * mean-sea-level); Android `getAltitude()` is already ellipsoidal.
       * @since 1.6.0
       * @schema
       */
      altitude?: number | null;
      /**
       * Direction of travel (course), degrees clockwise from true north —
       * NOT compass/magnetic heading. Host maps from iOS `course` /
       * Android `getBearing()` and sends `null` when unavailable or
       * stationary (iOS `-1`, Android `!hasBearing()`).
       * @since 1.6.0
       * @schema
       */
      heading?: number | null;
      /**
       * Ground speed in meters per second, or `null`.
       * @since 1.6.0
       * @schema
       */
      speed?: number | null;

      // --- Accuracy (one per measurement above; null when unavailable) ---
      /**
       * Accuracy radius of `latitude`/`longitude` in meters. Present on
       * success. Reflects the granted accuracy (coarse vs precise).
       * @since 1.6.0
       * @schema
       */
      horizontalAccuracy?: number;
      /**
       * Accuracy of `altitude` (vertical) in meters, or `null`.
       * @since 1.6.0
       * @schema
       */
      verticalAccuracy?: number | null;
      /**
       * Accuracy of `heading` in degrees, or `null`. Host maps from iOS
       * `courseAccuracy` (13.4+) / Android `getBearingAccuracyDegrees()`
       * (API 26+); `null` on older OS or when unavailable.
       * @since 1.6.0
       * @schema
       */
      headingAccuracy?: number | null;
      /**
       * Accuracy of `speed` in meters per second, or `null`. Host maps from
       * iOS `speedAccuracy` (10+) / Android
       * `getSpeedAccuracyMetersPerSecond()` (API 26+); `null` on older OS or
       * when unavailable.
       * @since 1.6.0
       * @schema
       */
      speedAccuracy?: number | null;

      // --- Meta ---
      /**
       * Unix timestamp (ms) of the reading. Present on success.
       * @since 1.6.0
       * @schema
       */
      timestamp?: number;
      /**
       * Error code when the request failed (no position delivered).
       * @since 1.6.0
       * @schema
       */
      errorCode?: LocationErrorCode;
    }>
  >;
}
