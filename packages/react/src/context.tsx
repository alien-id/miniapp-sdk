import { getLaunchParams, isBridgeAvailable, send } from '@alien-id/bridge';
import type { Version } from '@alien-id/contract';

import { createContext, type ReactNode, useEffect, useMemo } from 'react';

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
}

export const AlienContext = createContext<AlienContextValue | null>(null);

export interface AlienProviderProps {
  children: ReactNode;
}

/**
 * Provider component that initializes the Alien miniapp context.
 * Must wrap your app to use Alien hooks.
 *
 * @example
 * ```tsx
 * import { AlienProvider } from '@alien-id/react';
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
export function AlienProvider({ children }: AlienProviderProps): ReactNode {
  const value = useMemo<AlienContextValue>(() => {
    const launchParams = getLaunchParams();
    return {
      authToken: launchParams?.authToken,
      contractVersion: launchParams?.contractVersion,
      isBridgeAvailable: isBridgeAvailable(),
    };
  }, []);

  // Warn if bridge is not available on mount
  useEffect(() => {
    if (!value.isBridgeAvailable) {
      console.warn(
        '[@alien-id/react] Bridge is not available. Running in dev mode? The SDK will handle errors gracefully, but bridge communication will not work.',
      );
    }
  }, [value.isBridgeAvailable]);

  // Signal ready to host app when miniapp is loaded
  useEffect(() => {
    if (value.isBridgeAvailable) {
      send('app:ready', {});
    }
  }, [value.isBridgeAvailable]);

  return (
    <AlienContext.Provider value={value}>{children}</AlienContext.Provider>
  );
}
