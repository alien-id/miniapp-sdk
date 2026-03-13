import type { MethodName, Version } from '@alien-id/miniapps-contract';
import { getMethodMinVersion, isMethodSupported } from '@alien-id/miniapps-contract';
import { BridgeMethodUnsupportedError, BridgeUnavailableError } from './errors';
import { isBridgeAvailable } from './utils';

/**
 * Discriminated union for safe execution results.
 * Returned by `.ifAvailable()` methods instead of throwing.
 */
export type SafeResult<T> = { ok: true; data: T } | { ok: false; error: Error };

/**
 * Options for availability checks.
 */
export interface AvailabilityOptions {
  /** Contract version to check method support against. */
  version?: Version;
}

/**
 * Checks if a method can be executed.
 * Verifies bridge availability and optionally checks version support.
 *
 * @param method - The method name to check
 * @param options - Optional availability options (version check)
 * @returns `true` if the method can be executed, `false` otherwise
 */
export function isAvailable(
  method: MethodName,
  options?: AvailabilityOptions,
): boolean {
  if (!isBridgeAvailable()) {
    return false;
  }

  if (options?.version) {
    return isMethodSupported(method, options.version);
  }

  return true;
}

/**
 * Checks availability and returns a SafeResult error if not available.
 * Internal helper used by sendIfAvailable and requestIfAvailable.
 *
 * @returns A SafeResult error if not available, or undefined if available
 */
export function checkAvailability(
  method: MethodName,
  options?: AvailabilityOptions,
): SafeResult<never> | undefined {
  if (!isBridgeAvailable()) {
    return { ok: false, error: new BridgeUnavailableError() };
  }

  if (options?.version) {
    if (!isMethodSupported(method, options.version)) {
      const minVersion = getMethodMinVersion(method);
      return {
        ok: false,
        error: new BridgeMethodUnsupportedError(
          method,
          options.version,
          minVersion,
        ),
      };
    }
  }

  return undefined;
}
