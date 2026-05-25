import type { Version } from '../../utils';
import type { MethodName } from '../types/method-types';
import { releases } from './releases';

export { getReleaseVersion } from './get-release-version';
export { releases } from './releases';

/**
 * Compare two semver versions on their major.minor.patch numbers only.
 *
 * Pre-release identifiers (`-rc.1`, `-alpha.3`) and build metadata
 * (`+sha`) are stripped before parsing, so `1.5.3-rc.1` compares equal
 * to `1.5.3` regardless of which component carries the suffix.
 *
 * Rationale: the host injects a single Contract Version string
 * (`window.__ALIEN_CONTRACT_VERSION__`). Method support is a property of
 * the *released* contract surface, not of the tag spelling — a host on
 * `1.5.3-rc.1` ships the same methods as `1.5.3`. Honouring the
 * pre-release suffix would deny callers methods their host already
 * declares.
 *
 * If stricter semver ordering is ever required (e.g. for a host that
 * exposes draft methods only on RC builds), add a dedicated comparator
 * rather than overloading this one.
 *
 * @returns negative if a < b, 0 if a === b, positive if a > b
 */
const SEMVER_RE =
  /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function compareVersions(a: Version, b: Version): number {
  const parse = (v: Version): [number, number, number] => {
    const m = SEMVER_RE.exec(v);
    if (!m) throw new TypeError(`Invalid version string: ${JSON.stringify(v)}`);
    // Indices 1–3 are guaranteed numeric by the regex.
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };
  const [aMajor, aMinor, aPatch] = parse(a);
  const [bMajor, bMinor, bPatch] = parse(b);
  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

const ASCENDING_RELEASE_VERSIONS: readonly Version[] = (
  Object.keys(releases) as Version[]
).sort(compareVersions);

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
