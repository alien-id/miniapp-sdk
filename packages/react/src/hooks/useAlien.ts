import { useContext } from 'react';
import { AlienContext, type AlienContextValue } from '../context';

/**
 * Hook to access the Alien context.
 * Must be used within an AlienProvider.
 *
 * @example
 * ```tsx
 * const { authToken, contractVersion, isBridgeAvailable } = useAlien();
 * ```
 */
export function useAlien(): AlienContextValue {
  const context = useContext(AlienContext);
  if (!context) {
    throw new Error('useAlien must be used within an AlienProvider');
  }
  return context;
}
