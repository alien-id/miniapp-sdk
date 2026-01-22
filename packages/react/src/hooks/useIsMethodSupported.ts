import {
  getMethodMinVersion,
  isMethodSupported,
  type MethodName,
  type Version,
} from '@alien-id/contract';
import { useAlien } from '.';

export interface MethodSupportResult {
  /**
   * Whether the method is supported in the current contract version.
   * Always `true` if no version is provided (fallback behavior).
   */
  supported: boolean;
  /**
   * The contract version provided by the host app.
   */
  contractVersion: Version | undefined;
  /**
   * The minimum version that supports this method.
   */
  minVersion: Version | undefined;
}

/**
 * Hook to check if a method is supported by the host app's contract version.
 *
 * @param method - The method name to check.
 * @returns Object with `supported`, `contractVersion`, and `minVersion`.
 *
 * @example
 * ```tsx
 * import { useMethodSupported } from '@alien-id/react';
 *
 * function MyComponent() {
 *   const { supported, minVersion } = useMethodSupported('payment:request');
 *
 *   if (!supported) {
 *     return <div>This feature requires version {minVersion}</div>;
 *   }
 *
 *   return <div>Feature available!</div>;
 * }
 * ```
 */
export function useIsMethodSupported(method: MethodName): MethodSupportResult {
  const { contractVersion } = useAlien();

  // Check if method is supported - only check if version exists
  // Fallback: assume supported if no version provided
  const supported = contractVersion
    ? isMethodSupported(method, contractVersion)
    : true;

  return {
    supported,
    contractVersion,
    minVersion: getMethodMinVersion(method),
  };
}
