import { getLaunchParams } from '@alien_org/bridge';
import type { LaunchParams } from '@alien_org/contract';
import { useEffect, useLayoutEffect, useState } from 'react';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Hook to get launch params.
 * Returns undefined if params unavailable (use mockLaunchParamsForDev in dev).
 *
 * @example
 * ```tsx
 * import { useLaunchParams } from '@alien_org/react';
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

  useIsomorphicLayoutEffect(() => {
    setParams(getLaunchParams());
  }, []);

  return params;
}
