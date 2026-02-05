import {
  enableLinkInterceptor,
  getLaunchParams,
  isBridgeAvailable,
  send,
} from '@alien_org/bridge';
import type { Version } from '@alien_org/contract';

import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface AlienContextValue {
  /**
   * Auth token injected by the host app.
   * `undefined` if not available.
   */
  authToken: string | undefined;
  /**
   * Contract version supported by the host app.
   * `undefined` if not provided (fallback: assume all methods supported).
   */
  contractVersion: Version | undefined;
  /**
   * Whether the bridge is available (running inside Alien App).
   */
  isBridgeAvailable: boolean;
  /**
   * Manually signal to the host app that the miniapp is ready.
   * Only needed when `autoReady` is set to `false`.
   * Safe to call multiple times — only the first call sends the signal.
   */
  ready: () => void;
}

export const AlienContext = createContext<AlienContextValue | null>(null);

export interface AlienProviderProps {
  children: ReactNode;
  /**
   * Whether to automatically send `app:ready` when the provider mounts.
   * Defaults to `true`.
   *
   * Set to `false` if you need to defer the ready signal (e.g., after
   * fetching initial data), then call `ready()` from `useAlien()` when done.
   *
   * @default true
   *
   * @example
   * ```tsx
   * // Auto (default) — fires immediately on mount
   * <AlienProvider>
   *   <App />
   * </AlienProvider>
   *
   * // Manual — fire when you're ready
   * <AlienProvider autoReady={false}>
   *   <App />
   * </AlienProvider>
   *
   * function App() {
   *   const { ready } = useAlien();
   *   useEffect(() => {
   *     fetchData().then(() => ready());
   *   }, []);
   * }
   * ```
   */
  autoReady?: boolean;
  /**
   * Whether to intercept external link clicks and route them through the
   * bridge's `link:open` method. Same-origin links are unaffected.
   * @default true
   */
  interceptLinks?: boolean;
}

/**
 * Provider component that initializes the Alien miniapp context.
 * Must wrap your app to use Alien hooks.
 *
 * @example
 * ```tsx
 * import { AlienProvider } from '@alien_org/react';
 *
 * function App() {
 *   return (
 *     <AlienProvider>
 *       <MyMiniapp />
 *     </AlienProvider>
 *   );
 * }
 * ```
 */
export function AlienProvider({
  children,
  autoReady = true,
  interceptLinks = true,
}: AlienProviderProps): ReactNode {
  const readySent = useRef(false);

  const ready = useCallback(() => {
    if (readySent.current) return;
    readySent.current = true;
    if (isBridgeAvailable()) {
      send('app:ready', {});
    }
  }, []);

  const [value, setValue] = useState<AlienContextValue>(() => ({
    authToken: undefined,
    contractVersion: undefined,
    isBridgeAvailable: false,
    ready,
  }));

  useIsomorphicLayoutEffect(() => {
    const launchParams = getLaunchParams();
    const bridgeAvailable = isBridgeAvailable();
    setValue({
      authToken: launchParams?.authToken,
      contractVersion: launchParams?.contractVersion,
      isBridgeAvailable: bridgeAvailable,
      ready,
    });
    if (!bridgeAvailable) {
      console.warn(
        '[@alien_org/react] Bridge is not available. Running in dev mode? The SDK will handle errors gracefully, but bridge communication will not work.',
      );
    }
  }, [ready]);

  // Auto-send app:ready on mount when autoReady is enabled
  useEffect(() => {
    if (autoReady) {
      ready();
    }
  }, [autoReady, ready]);

  // Intercept external link clicks by default
  useEffect(() => {
    if (interceptLinks) {
      return enableLinkInterceptor();
    }
  }, [interceptLinks]);

  return (
    <AlienContext.Provider value={value}>{children}</AlienContext.Provider>
  );
}
