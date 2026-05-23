import type { MethodName, Version } from '@alien-id/miniapps-contract';
import {
  getMethodMinVersion,
  isMethodSupported,
} from '@alien-id/miniapps-contract';
import {
  type BridgeError,
  BridgeMethodUnsupportedError,
  BridgeUnavailableError,
} from './errors';
import { isBridgeAvailable } from './utils';

/**
 * Whether a Method is Callable right now, and if not, why.
 *
 * - `{ callable: true }` — bridge is present AND the Host's Contract Version
 *   declares the Method (or no version was provided to check against).
 * - `{ callable: false, reason: 'no-bridge' }` — the bridge is not injected
 *   into `window`. The miniapp is running outside the Alien App (e.g. a
 *   browser tab in Dev Mode).
 * - `{ callable: false, reason: 'host-outdated', needs, has }` — the bridge
 *   is present but the Host's Contract Version is below the version that
 *   introduced the Method.
 */
export type Callability =
  | { callable: true }
  | { callable: false; reason: 'no-bridge' }
  | {
      callable: false;
      reason: 'host-outdated';
      needs: Version;
      has: Version;
    };

export interface CallabilityOptions {
  /** Host's Contract Version. If omitted, the version check is skipped. */
  version?: Version;
}

/**
 * Pure synchronous check: can this Method be called right now?
 *
 * Single canonical answer to the "is this Callable?" question. Every Strict
 * and Safe Track path through the bridge funnels through this function.
 *
 * @param method - The Method to check.
 * @param options - Optional Host Contract Version to gate on.
 * @returns A discriminated {@link Callability} value.
 */
export function callability(
  method: MethodName,
  options?: CallabilityOptions,
): Callability {
  if (!isBridgeAvailable()) {
    return { callable: false, reason: 'no-bridge' };
  }

  const has = options?.version;
  if (!has) return { callable: true };

  if (isMethodSupported(method, has)) return { callable: true };

  // Method isn't supported in `has`. `getMethodMinVersion` should always
  // resolve since `MethodName` is a literal union of registered methods;
  // if it doesn't (registry drift, cast bypass), fall back to `has` so we
  // still fail closed instead of silently reporting `callable: true`.
  const needs = getMethodMinVersion(method) ?? has;
  return { callable: false, reason: 'host-outdated', needs, has };
}

/**
 * Maps a {@link Callability} result to the matching {@link BridgeError}.
 * Returns `undefined` when the Method is Callable. Single source of truth
 * for the `Callability → BridgeError` mapping shared by Strict Track
 * (throws) and Safe Track (`SafeResult.error`).
 */
export function callabilityError(
  method: MethodName,
  result: Callability,
): BridgeError | undefined {
  if (result.callable) return undefined;
  if (result.reason === 'no-bridge') return new BridgeUnavailableError();
  return new BridgeMethodUnsupportedError(method, result.has, result.needs);
}
