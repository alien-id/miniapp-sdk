import type { CallabilityOptions } from './callability';

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
 * @deprecated Use {@link CallabilityOptions} from `./callability` instead.
 *
 * Compatibility shim — `AvailabilityOptions` and `CallabilityOptions` were
 * both `{ version?: Version }`. Kept as an alias so the public re-export in
 * `index.ts` continues to work until Agent #2 prunes it. Remove once that
 * re-export is gone.
 */
export type AvailabilityOptions = CallabilityOptions;
