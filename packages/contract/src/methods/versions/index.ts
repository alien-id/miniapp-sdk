import type { Version } from '../../utils';
import type { MethodName } from '../types/method-types';
import { releases } from './releases';

export { getReleaseVersion } from './get-release-version';
export { releases } from './releases';

/**
 * Compare two semver versions on their major.minor.patch numbers only.
 *
 * Pre-release identifiers (`1.0.0-rc.1`, `0.2.0-alpha.3`, build metadata
 * after `+`) are intentionally ignored: each component is parsed with
 * `Number(part)`, and any non-numeric remainder (e.g. `'0-rc'`) collapses
 * to `0` via the `isFinite` guard. The net effect is that `1.0.0-rc.1`
 * compares equal to `1.0.0`.
 *
 * Rationale: the host injects a single Contract Version string
 * (`window.__ALIEN_CONTRACT_VERSION__`). Method support is a property of
 * the *released* contract surface, not of the tag spelling — a host on
 * `1.0.0-rc.1` ships the same methods as `1.0.0`. Honouring the
 * pre-release suffix would deny callers methods their host already
 * declares.
 *
 * If stricter semver ordering is ever required (e.g. for a host that
 * exposes draft methods only on RC builds), add a dedicated comparator
 * rather than overloading this one.
 *
 * @returns negative if a < b, 0 if a === b, positive if a > b
 */
function compareVersions(a: Version, b: Version): number {
  const parse = (v: Version): [number, number, number] => {
    const [maj, min, pat] = v.split('.').map((p) => {
      const n = Number(p);
      return Number.isFinite(n) ? n : 0;
    });
    return [maj ?? 0, min ?? 0, pat ?? 0];
  };
  const [aMajor, aMinor, aPatch] = parse(a);
  const [bMajor, bMinor, bPatch] = parse(b);
  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

// Build a direct `MethodName → minimum Version` lookup at module load.
// The release table is static, so a single ascending pass yields the
// earliest version that registers each method. `getMethodMinVersion`
// then resolves a method in O(1) instead of rescanning every release.
const ASCENDING_RELEASE_VERSIONS: readonly Version[] = (
  Object.keys(releases) as Version[]
).sort(compareVersions);

const METHOD_MIN_VERSION: ReadonlyMap<MethodName, Version> = (() => {
  const map = new Map<MethodName, Version>();
  for (const version of ASCENDING_RELEASE_VERSIONS) {
    const methods = releases[version];
    if (!methods) continue;
    for (const entry of methods) {
      const name = (
        typeof entry === 'string' ? entry : entry.method
      ) as MethodName;
      if (!map.has(name)) map.set(name, version);
    }
  }
  return map;
})();

/**
 * Highest contract version declared in the {@link releases} table.
 *
 * Derived from the table so it stays in step when a new release lands —
 * no hand-bump required. Useful as the default `contractVersion` for
 * dev tooling, mocks, and CI fixtures.
 */
export const LATEST_VERSION: Version =
  ASCENDING_RELEASE_VERSIONS[ASCENDING_RELEASE_VERSIONS.length - 1] ??
  ('0.0.0' as Version);

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
 * `undefined` if the method is not in any release. Backed by a
 * module-load-time `Map` lookup — O(1) per call.
 */
export function getMethodMinVersion(method: MethodName): Version | undefined {
  return METHOD_MIN_VERSION.get(method);
}
