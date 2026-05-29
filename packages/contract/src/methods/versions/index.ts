import type { Version } from '../../utils';
import type { MethodName } from '../types/method-types';
import { ascendingReleaseVersions, compareVersions } from './compare';
import { releases } from './releases';

// Re-exported from the shared comparator module so existing imports of
// `compareVersions` / `isValidVersion` from this barrel keep working.
export { compareVersions, isValidVersion } from './compare';
export { getReleaseVersion } from './get-release-version';
export { releases } from './releases';

const ASCENDING_RELEASE_VERSIONS: readonly Version[] = ascendingReleaseVersions(
  Object.keys(releases) as Version[],
);

// Walked in ascending order, first-seen wins — so each method maps to
// the earliest release that introduced it.
const methodMinVersion = new Map<MethodName, Version>();
for (const version of ASCENDING_RELEASE_VERSIONS) {
  const methods = releases[version];
  if (!methods) continue;
  for (const entry of methods) {
    const name = (
      typeof entry === 'string' ? entry : entry.method
    ) as MethodName;
    if (!methodMinVersion.has(name)) methodMinVersion.set(name, version);
  }
}
const METHOD_MIN_VERSION: ReadonlyMap<MethodName, Version> = methodMinVersion;

/**
 * Runtime list of every method declared in the {@link releases} table.
 *
 * TypeScript types are erased at runtime, so this constant is the only
 * honest way to enumerate methods. Iterate it for tests, tooling, or
 * dev surface that needs to walk every method.
 */
export const METHOD_NAMES: readonly MethodName[] = Array.from(
  METHOD_MIN_VERSION.keys(),
);

/**
 * Highest contract version declared in the {@link releases} table.
 *
 * Derived from the table so it stays in step when a new release lands —
 * no hand-bump required. Useful as the default `contractVersion` for
 * dev tooling, mocks, and CI fixtures.
 */
export const LATEST_VERSION: Version =
  ASCENDING_RELEASE_VERSIONS[ASCENDING_RELEASE_VERSIONS.length - 1] ?? '0.0.0';

/**
 * Check whether the contract declares a method at the given version.
 *
 * Returns `true` if the host's contract version is at or above the
 * minimum release that introduced the method. This is the **Method
 * Support** question from `CONTEXT.md` — pure protocol, no runtime
 * state. It does *not* answer **Bridge Availability** or **Callability**
 * (see `bridge/callability` for those).
 *
 * In particular, a `true` here does not mean the method can be invoked
 * right now: the bridge might be absent (Dev Mode). Callers that need
 * "can I call this right now?" should consume the bridge's `callability`
 * function instead of composing this check manually.
 *
 * Pre-release identifiers on the version are stripped — see
 * `compareVersions` for the rationale.
 *
 * @param method - The method name to check.
 * @param version - The contract version (must be a valid version string, not undefined).
 * @returns `true` if the method is declared at or before the given version, `false` otherwise.
 *
 * @remarks
 * This function only accepts valid version strings. Version existence
 * checks should be handled at a higher level before calling this
 * function.
 */
export function isMethodSupported(
  method: MethodName,
  version: Version,
): boolean {
  const minVersion = getMethodMinVersion(method);
  if (!minVersion) return false;

  return compareVersions(version, minVersion) >= 0;
}

/**
 * Get the minimum contract version that declares a method, or
 * `undefined` if the method is not in any release.
 */
export function getMethodMinVersion(method: MethodName): Version | undefined {
  return METHOD_MIN_VERSION.get(method);
}
