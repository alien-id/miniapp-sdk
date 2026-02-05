import { getLaunchParams, isBridgeAvailable, send } from '@alien_org/bridge';
import type { Version } from '@alien_org/contract';

import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

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
}: AlienProviderProps): ReactNode {
  const readySent = useRef(false);

  const ready = useCallback(() => {
    if (readySent.current) return;
    readySent.current = true;
    if (isBridgeAvailable()) {
      send('app:ready', {});
    }
  }, []);

  const value = useMemo<AlienContextValue>(() => {
    const launchParams = getLaunchParams();
    return {
      authToken: launchParams?.authToken,
      contractVersion: launchParams?.contractVersion,
      isBridgeAvailable: isBridgeAvailable(),
      ready,
    };
  }, [ready]);

  // Warn if bridge is not available on mount
  useEffect(() => {
    if (!value.isBridgeAvailable) {
      console.warn(
        '[@alien_org/react] Bridge is not available. Running in dev mode? The SDK will handle errors gracefully, but bridge communication will not work.',
      );
    }
  }, [value.isBridgeAvailable]);

  // Auto-send app:ready on mount when autoReady is enabled
  useEffect(() => {
    if (autoReady) {
      ready();
    }
  }, [autoReady, ready]);

  return (
    <AlienContext.Provider value={value}>{children}</AlienContext.Provider>
  );
}
