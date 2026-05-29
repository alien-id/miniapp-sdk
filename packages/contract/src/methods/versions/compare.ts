import type { Version } from '../../utils';

/**
 * The contract's accepted version shape: `X.Y.Z` with optional
 * `-prerelease` and `+build` suffixes. Single source of truth shared by
 * {@link isValidVersion}, {@link compareVersions}, and the release
 * ordering — so boundary validators and ordering logic agree by
 * construction.
 */
const SEMVER_RE =
  /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Whether a string matches the contract's accepted version shape.
 * Used by boundary validators (e.g. host-injected
 * `__ALIEN_CONTRACT_VERSION__`) and direct callers of
 * {@link compareVersions}.
 */
export function isValidVersion(value: string): boolean {
  return SEMVER_RE.test(value);
}

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

/**
 * Sort version strings ascending by {@link compareVersions}. The single
 * source of truth for release ordering — both `getMethodMinVersion` and
 * `getReleaseVersion` walk this so they can never disagree on "earliest
 * release". Returns a new array; the input is not mutated.
 */
export function ascendingReleaseVersions(
  versions: readonly Version[],
): Version[] {
  return [...versions].sort(compareVersions);
}
