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
  /**
   * Custom start parameter injected by host app.
   * Used for referral codes, campaign tracking, or custom routing.
   */
  startParam: string | undefined;
}
