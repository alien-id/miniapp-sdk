import type { Version } from '@alien-id/contract';
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

declare global {
  interface Window {
    __ALIEN_AUTH_TOKEN__?: string;
    __ALIEN_CONTRACT_VERSION__?: string;
  }
}

interface AlienContextValue {
  /**
   * Auth token injected by the host app.
   * `undefined` if not yet available.
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
  isInAlienApp: boolean;
}

const AlienContext = createContext<AlienContextValue | null>(null);

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
    const authToken =
      typeof window !== 'undefined' ? window.__ALIEN_AUTH_TOKEN__ : undefined;

    let contractVersion: Version | undefined;
    if (typeof window !== 'undefined' && window.__ALIEN_CONTRACT_VERSION__) {
      const version = window.__ALIEN_CONTRACT_VERSION__;
      // Validate version format
      if (/^\d+\.\d+\.\d+$/.test(version)) {
        contractVersion = version as Version;
      }
    }

    const isInAlienApp =
      typeof window !== 'undefined' && '__miniAppsBridge__' in window;

    return { authToken, contractVersion, isInAlienApp };
  }, []);

  return <AlienContext.Provider value={value}>{children}</AlienContext.Provider>;
}

/**
 * Hook to access the Alien context.
 * Must be used within an AlienProvider.
 *
 * @example
 * ```tsx
 * const { authToken, contractVersion, isInAlienApp } = useAlien();
 * ```
 */
export function useAlien(): AlienContextValue {
  const context = useContext(AlienContext);
  if (!context) {
    throw new Error('useAlien must be used within an AlienProvider');
  }
  return context;
}
