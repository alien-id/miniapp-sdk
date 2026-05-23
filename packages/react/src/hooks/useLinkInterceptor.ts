import {
  enableLinkInterceptor,
  type LinkInterceptorOptions,
} from '@alien-id/miniapps-bridge';
import { useEffect } from 'react';

/**
 * Intercepts external link clicks and routes them through the bridge.
 *
 * The hook unconditionally calls `enableLinkInterceptor`. That function
 * already checks for `window` and `isBridgeAvailable()` internally — when
 * the bridge is absent it returns a no-op cleanup. Adding a React-side
 * gate on top would be redundant and (worse) would skip attaching on the
 * provider's first render, when `useAlien().isBridgeAvailable` is still
 * the initial `false`. See auditor #5 M2.
 *
 * Note: this hook intentionally does NOT expose `callable`. Link
 * interception is a global side effect that the consumer enables
 * declaratively, not a method the consumer invokes — there is nothing
 * for `callable` to gate.
 *
 * @example
 * ```tsx
 * function App() {
 *   useLinkInterceptor();
 *   return <a href="https://external.com">Opens via host app</a>;
 * }
 * ```
 */
export function useLinkInterceptor(options: LinkInterceptorOptions = {}): void {
  const { openMode } = options;

  useEffect(() => {
    return enableLinkInterceptor({ openMode });
  }, [openMode]);
}
