import type { Version } from '@alien-id/miniapps-contract';

/**
 * Discriminated union for safe execution results.
 * Returned by `*IfAvailable` functions instead of throwing.
 *
 * The error channel is generic so Safe Track entry points can pin it to a
 * narrower subclass (e.g., `BridgeError`) and remove the `instanceof` /
 * cast dance at call sites.
 */
export type SafeResult<T, E extends Error = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

/**
 * Options for the Safe Track functions to override the Host's Contract
 * Version. When omitted, launch params are used.
 */
export interface AvailabilityOptions {
  /** Contract Version to gate on. Defaults to launch params if unset. */
  version?: Version;
}
