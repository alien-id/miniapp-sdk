import { getLaunchParams } from '@alien-id/miniapps-bridge';
import type { LaunchParams } from '@alien-id/miniapps-contract';
import { useState } from 'react';

/**
 * Hook to get launch params.
 * Returns undefined if params unavailable (use mockLaunchParamsForDev in dev).
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
  const [params] = useState(() => getLaunchParams());

  return params;
}
