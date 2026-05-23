import {
  BridgeMethodUnsupportedError,
  BridgeUnavailableError,
  type Callability,
  callability,
} from '@alien-id/miniapps-bridge';
import type { MethodName } from '@alien-id/miniapps-contract';
import { useMemo } from 'react';
import { useAlien } from './useAlien';

/**
 * Translate a refusing {@link Callability} into the appropriate
 * `BridgeError` subclass — `BridgeUnavailableError` when no bridge is
 * present, `BridgeMethodUnsupportedError` when the Host's Contract Version
 * is below the Method's minimum. Returns `undefined` when the Method is
 * Callable so consumers can branch with `if (error) ...`.
 *
 * Mirrors the bridge package's internal `callabilityError` helper; kept
 * locally because the bridge does not re-export it yet.
 */
export function callabilityError(
  method: MethodName,
  c: Callability,
): BridgeUnavailableError | BridgeMethodUnsupportedError | undefined {
  if (c.callable) return undefined;
  if (c.reason === 'no-bridge') return new BridgeUnavailableError();
  return new BridgeMethodUnsupportedError(method, c.has, c.needs);
}

/**
 * Decorate a hook's return object with a deprecated `supported` accessor
 * that mirrors `callable` and logs a one-shot console.warn the first time
 * a consumer reads it. The warn helps upstream code complete the
 * `supported → callable` rename without silently shipping a behavioral
 * regression; the value-identity contract means existing branches keep
 * working until the consumer migrates. Once per return object — re-running
 * the hook produces a fresh object and can warn again, but a single render
 * cannot trigger more than one warn no matter how many reads happen.
 */
export function withSupportedAlias<
  T extends { callable: boolean },
>(value: T): T {
  let warned = false;
  Object.defineProperty(value, 'supported', {
    configurable: true,
    enumerable: false,
    get() {
      if (!warned && process.env.NODE_ENV !== 'production') {
        warned = true;
        console.warn(
          '[@alien-id/miniapps-react] `supported` is deprecated; use `callable` instead',
        );
      }
      return value.callable;
    },
  });
  return value;
}

/**
 * Returns the {@link Callability} of a Method for the current Host —
 * the canonical "can I call this right now?" answer.
 *
 * Synchronous and safe to call during render. Re-evaluates when
 * `contractVersion` from {@link useAlien} changes.
 *
 * @example
 * ```tsx
 * const result = useCallable('payment:request');
 * if (result.callable) return <PayButton />;
 * if (result.reason === 'no-bridge') return <OpenInAlienApp />;
 * return <UpdateAlienApp needs={result.needs} has={result.has} />;
 * ```
 */
export function useCallable(method: MethodName): Callability {
  const { contractVersion } = useAlien();
  return useMemo(
    () => callability(method, { version: contractVersion }),
    [method, contractVersion],
  );
}
