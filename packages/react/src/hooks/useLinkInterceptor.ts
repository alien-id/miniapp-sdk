import {
  enableLinkInterceptor,
  type LinkInterceptorOptions,
} from '@alien_org/bridge';
import { useEffect } from 'react';
import { useAlien } from './useAlien';

/**
 * Intercepts external link clicks and routes them through the bridge.
 * Activates when the bridge is available, cleans up on unmount.
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
  const { isBridgeAvailable } = useAlien();
  const { openMode } = options;

  useEffect(() => {
    if (!isBridgeAvailable) return;
    return enableLinkInterceptor({ openMode });
  }, [isBridgeAvailable, openMode]);
}
