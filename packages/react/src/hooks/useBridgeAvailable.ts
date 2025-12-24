import { useEffect } from 'react';
import { useAlien } from '../context';

/**
 * Hook to check if the bridge is available.
 * Warns on mount if bridge is not available.
 *
 * @returns `true` if bridge is available, `false` otherwise.
 *
 * @example
 * ```tsx
 * import { useBridgeAvailable } from '@alien-id/react';
 *
 * function MyComponent() {
 *   const isAvailable = useBridgeAvailable();
 *
 *   if (!isAvailable) {
 *     return <div>Please open in Alien App</div>;
 *   }
 *
 *   return <div>Bridge is available!</div>;
 * }
 * ```
 */
export function useBridgeAvailable(): boolean {
  const { isBridgeAvailable } = useAlien();

  useEffect(() => {
    if (!isBridgeAvailable) {
      console.warn(
        '[@alien-id/react] Bridge is not available. Running in dev mode? Bridge communication will not work.',
      );
    }
  }, [isBridgeAvailable]);

  return isBridgeAvailable;
}
