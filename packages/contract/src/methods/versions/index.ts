import type { Version } from '../../utils';
import type { MethodName } from '../types/method-types';
import { releases } from './releases';

export { getReleaseVersion } from './get-release-version';
export { releases } from './releases';

/**
 * Check if a method is supported in a given version.
 *
 * @param method - The method name to check.
 * @param version - The contract version (must be a valid version string, not undefined).
 * @returns `true` if the method is supported in the given version, `false` otherwise.
 *
 * @remarks
 * This function only accepts valid version strings. Version existence checks should be
 * handled at a higher level before calling this function.
 */
export function isMethodSupported(
  method: MethodName,
  version: Version,
): boolean {
  const methods = releases[version];
  if (!methods) return false;

  return methods.some((m) =>
    typeof m === 'string' ? m === method : m.method === method,
  );
}

/**
 * Get the minimum version that supports a method.
 * Returns undefined if method not found in any version.
 */
export function getMethodMinVersion(method: MethodName): Version | undefined {
  const versions = Object.keys(releases) as Version[];
  const sorted = versions.sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
    const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
    if (aMajor !== bMajor) return (aMajor ?? 0) - (bMajor ?? 0);
    if (aMinor !== bMinor) return (aMinor ?? 0) - (bMinor ?? 0);
    return (aPatch ?? 0) - (bPatch ?? 0);
  });

  for (const version of sorted) {
    const methods = releases[version];
    if (!methods) continue;

    const found = methods.some((m) =>
      typeof m === 'string' ? m === method : m.method === method,
    );
    if (found) return version;
  }

  return undefined;
}
