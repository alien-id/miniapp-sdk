import type { Version } from '@alien-id/contract';
import { useAlien } from '../context';

/**
 * Hook to get the contract version provided by the host app.
 *
 * @returns The contract version, or `undefined` if not provided.
 *
 * @example
 * ```tsx
 * import { useContractVersion } from '@alien-id/react';
 *
 * function MyComponent() {
 *   const version = useContractVersion();
 *
 *   return <div>Contract version: {version ?? 'unknown'}</div>;
 * }
 * ```
 */
export function useContractVersion(): Version | undefined {
  const { contractVersion } = useAlien();
  return contractVersion;
}
