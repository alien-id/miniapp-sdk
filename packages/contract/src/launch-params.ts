import type { Version } from './utils';

/**
 * Supported platforms for miniapps.
 */
export const PLATFORMS = ['ios', 'android'] as const;

/**
 * Platform the miniapp is running on.
 */
export type Platform = (typeof PLATFORMS)[number];

/**
 * Supported display modes for miniapps.
 *
 * - `standard` — Default. Native header with close button, options menu, and
 *   miniapp title is visible. WebView is inset below the header. Safe area
 *   insets account for the header height.
 *
 * - `fullscreen` — WebView occupies the entire screen. The native close button
 *   and options menu remain as floating overlays so the user can always exit.
 *   The miniapp must respect safe area insets for system UI (status bar, notch,
 *   home indicator).
 *
 * - `immersive` — WebView occupies the entire screen with zero native UI.
 *   No close button, no options menu, no header — the miniapp owns the full
 *   viewport. The miniapp is responsible for providing its own exit mechanism
 *   (e.g. calling `app:close`). Safe area insets still apply for system UI.
 */
export const DISPLAY_MODES = ['standard', 'fullscreen', 'immersive'] as const;

/**
 * Display mode for the miniapp webview.
 */
export type DisplayMode = (typeof DISPLAY_MODES)[number];

/**
 * Safe area insets in CSS pixels, injected by the host app.
 * Accounts for system UI (status bar, notch, home indicator, nav bar).
 */
export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Launch parameters injected by the host app.
 */
export interface LaunchParams {
  /** JWT auth token injected by host app */
  authToken: string | undefined;
  /** Contract version supported by host app (semver) */
  contractVersion: Version | undefined;
  /** Host app version (e.g., '1.2.3') */
  hostAppVersion: string | undefined;
  /** Platform the miniapp is running on */
  platform: Platform | undefined;
  /** Safe area insets for the webview in CSS pixels */
  safeAreaInsets: SafeAreaInsets | undefined;
  /**
   * Custom start parameter injected by host app.
   * Used for referral codes, campaign tracking, or custom routing.
   */
  startParam: string | undefined;
  /**
   * Display mode for the miniapp webview.
   * Defaults to `'standard'` when not provided by the host app.
   * @since 1.0.0
   */
  displayMode: DisplayMode;
}
