import { describe, expect, test } from 'bun:test';
import type { MethodName, Version } from '../src';
import {
  getMethodMinVersion,
  isMethodSupported,
  isValidVersion,
  METHOD_NAMES,
  releases,
} from '../src';
// `compareVersions` is exported from the versions module but deliberately
// kept out of the package's public API (`src/index.ts`). Imported here so
// the comparator's contract — including the pre-release / build-metadata
// stripping rules — can be tested directly, without needing a fictional
// release table to exercise non-`.0` patch scenarios.
import { compareVersions } from '../src/methods/versions';

/**
 * Tests for the host-version gating algorithm in
 * `isMethodSupported` and `getMethodMinVersion`.
 *
 * Everything here is derived from the real {@link releases} table and
 * the contract's runtime list of {@link METHOD_NAMES} — adding a new
 * method or a new release version expands the matrix automatically,
 * so this suite never needs to be touched when the contract grows.
 *
 * What this file checks:
 *  - Algorithm regression: every (method, host version) pair classifies
 *    correctly — this is the only assertion you need that the gating
 *    semantics still work end-to-end.
 *  - Versioning corner cases the algorithm has to get right on its
 *    own: pre-release tags, future major versions, unknown methods.
 *
 * What this file deliberately does NOT check:
 *  - Per-method "host X sees method Y" anchors. Those add maintenance
 *    cost (hand-listed method names) without adding coverage on top of
 *    the cross-product test below.
 */

/**
 * Independent semver compare used to derive the expected outcome of
 * the cross-product test. Kept separate from the production
 * comparator so the test doesn't validate the algorithm against its
 * own implementation — if either side drifts, the test fails.
 */
function plainSemverCompare(a: Version, b: Version): number {
  const pa = a.split('.').map((p) => parseInt(p, 10));
  const pb = b.split('.').map((p) => parseInt(p, 10));
  for (let i = 0; i < 3; i++) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

describe('getMethodMinVersion', () => {
  test('returns a release version for every method in the contract', () => {
    for (const method of METHOD_NAMES) {
      expect(
        getMethodMinVersion(method),
        `${method} has no release entry`,
      ).toBeDefined();
    }
  });

  test('returns undefined for unknown method names', () => {
    expect(getMethodMinVersion('unknown:method' as MethodName)).toBeUndefined();
    expect(getMethodMinVersion('' as MethodName)).toBeUndefined();
  });
});

describe('isMethodSupported', () => {
  test('every (method, host version) pair classifies correctly', () => {
    const hostVersions = Object.keys(releases) as Version[];
    for (const method of METHOD_NAMES) {
      const minV = getMethodMinVersion(method);
      if (!minV) throw new Error(`unreachable: ${method} has no min version`);
      for (const hostV of hostVersions) {
        const expected = plainSemverCompare(hostV, minV) >= 0;
        expect(
          isMethodSupported(method, hostV),
          `${method} on host ${hostV} (introduced in ${minV}) should be ${expected ? 'supported' : 'unsupported'}`,
        ).toBe(expected);
      }
    }
  });

  test('returns false for methods that are not in the contract', () => {
    expect(
      isMethodSupported('unknown:method' as MethodName, '99.0.0' as Version),
    ).toBe(false);
  });
});

describe('isMethodSupported — pre-release tag handling', () => {
  test('-rc.1 on a release tag still counts as supported', () => {
    const sampled = METHOD_NAMES[0];
    if (!sampled) throw new Error('no methods in contract');
    const minV = getMethodMinVersion(sampled);
    if (!minV) throw new Error('unreachable');
    expect(isMethodSupported(sampled, `${minV}-rc.1` as Version)).toBe(true);
  });

  test('-beta.3 on a future major version counts as supported', () => {
    const sampled = METHOD_NAMES[0];
    if (!sampled) throw new Error('no methods in contract');
    expect(isMethodSupported(sampled, '99.0.0-beta.3' as Version)).toBe(true);
  });
});

/**
 * Direct comparator tests.
 *
 * `compareVersions` is a private helper exported only for testing — see
 * the import comment at the top of this file. These tests pin down the
 * contract that `isMethodSupported` exercises only indirectly: cases
 * that depend on the relationship between two specific versions (e.g.
 * "`1.5.3-rc.1` and `1.5.2`") rather than the release-table state.
 */
describe('compareVersions', () => {
  test('strips pre-release suffix on any component, not just patch == 0', () => {
    expect(
      compareVersions('1.5.3-rc.1' as Version, '1.5.3' as Version),
    ).toBe(0);
  });

  test('strips build metadata the same way as pre-release', () => {
    expect(
      compareVersions('1.5.3+sha.abc' as Version, '1.5.3' as Version),
    ).toBe(0);
  });

  test('1.5.3-rc.1 is strictly greater than 1.5.2', () => {
    expect(
      compareVersions('1.5.3-rc.1' as Version, '1.5.2' as Version),
    ).toBeGreaterThan(0);
  });

  test('1.5.0-rc.1 does not get over-promoted to 1.5.3', () => {
    expect(compareVersions('1.5.0-rc.1' as Version, '1.5.3' as Version)).toBeLessThan(0);
  });

  test.each([
    ['empty string', ''],
    ['whitespace', '  '],
    ['major only', '1'],
    ['major.minor only', '1.5'],
    ['four components', '1.2.3.4'],
    ['empty patch (trailing dot)', '1.2.'],
    ['double dot', '1..2'],
    ['non-numeric component', '1.x.3'],
    ['leading hyphen', '-1.2.3'],
    ['bare pre-release', 'rc.1'],
  ])('throws on malformed input: %s', (_label, input) => {
    expect(() => compareVersions(input as Version, '1.0.0' as Version)).toThrow();
  });
});

describe('isValidVersion', () => {
  test.each([
    ['plain X.Y.Z', '1.2.3'],
    ['pre-release', '1.2.3-rc.1'],
    ['build metadata', '1.2.3+sha.abc'],
    ['pre-release plus build', '1.2.3-rc.1+sha.abc'],
    ['zero version', '0.0.0'],
  ])('accepts %s', (_label, input) => {
    expect(isValidVersion(input)).toBe(true);
  });

  test.each([
    ['empty', ''],
    ['major only', '1'],
    ['major.minor only', '1.5'],
    ['four components', '1.2.3.4'],
    ['non-numeric', '1.x.3'],
    ['garbage', 'not-a-version'],
    ['leading hyphen', '-1.2.3'],
  ])('rejects %s', (_label, input) => {
    expect(isValidVersion(input)).toBe(false);
  });
});
