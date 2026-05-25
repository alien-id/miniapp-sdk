import { describe, expect, test } from 'bun:test';
import {
  getMethodMinVersion,
  isMethodSupported,
  METHOD_NAMES,
  releases,
} from '../src';
import type { MethodName, Version } from '../src';

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
  // `compareVersions` strips pre-release identifiers only when the
  // patch component itself is `0` — splitting `1.5.0-rc.1` by `.`
  // leaves the third token as `0-rc`, which collapses to `0`. The
  // current release table happens to register every method on an
  // `X.Y.0` version, so this works in practice; if that ever stops
  // being true, fix the comparator and revisit this test.
  test('-rc.1 on an X.Y.0 release tag still counts as supported', () => {
    const sampled = METHOD_NAMES.find((m) =>
      getMethodMinVersion(m)?.endsWith('.0'),
    );
    if (!sampled) throw new Error('no method with a .0 patch min version');
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
