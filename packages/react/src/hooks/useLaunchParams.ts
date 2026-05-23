import { getLaunchParams } from '@alien-id/miniapps-bridge';
import type { LaunchParams } from '@alien-id/miniapps-contract';
import { useEffect, useState } from 'react';

/**
 * Hook to get launch params.
 * Returns undefined if params unavailable (use mockLaunchParamsForDev in dev).
 *
 * Reads window globals **after mount**, so SSR renders match between server
 * and client (both produce `undefined`), and the client picks up the real
 * params on the first effect tick. Launch params are injected once at boot
 * and never change at runtime; if you need a live signal (e.g.
 * `contractVersion`), read it from `useAlien()` instead.
 *
 * @example
 * ```tsx
 * import { useLaunchParams } from '@alien-id/miniapps-react';
 *
 * function MyComponent() {
 *   const launchParams = useLaunchParams();
 *
 *   if (!launchParams) {
 *     return <div>Running outside Alien App</div>;
 *   }
 *
 *   return <div>Platform: {launchParams.platform}</div>;
 * }
 * ```
 */
export function useLaunchParams(): LaunchParams | undefined {
  const [params, setParams] = useState<LaunchParams | undefined>(undefined);

  useEffect(() => {
    setParams(getLaunchParams());
  }, []);

  return params;
}
