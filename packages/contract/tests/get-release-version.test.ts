import { describe, expect, test } from 'bun:test';
import type { MethodName, Version } from '../src';
import { getReleaseVersion, METHOD_NAMES, releases } from '../src';

/**
 * Tests `getReleaseVersion` against the real release table.
 *
 * The previous version of this file used `mock.module('.../releases')`
 * to swap in a fixture, and that mock leaked across Bun's shared module
 * graph — releases.test.ts then had to regex-parse the source to dodge
 * the contamination. No mock here means every consumer of `releases`
 * sees the same data.
 *
 * Versioned-payload entries (`{ method, param }`) are not used in the
 * current release table. Once a method ships with versioned payloads,
 * add tests that cover the two-argument overload.
 */

const versionedPayloadMethods = Object.values(releases)
  .flat()
  .filter((entry) => typeof entry === 'object');

describe('getReleaseVersion — single-argument overload', () => {
  test('returns a version for every method in the contract', () => {
    for (const method of METHOD_NAMES) {
      const v = getReleaseVersion(method);
      expect(v, `${method} has no release entry`).not.toBeNull();
      // The returned version must itself appear in the table.
      expect(Object.keys(releases)).toContain(v as Version);
    }
  });

  test('agrees with the bare-string entries in the release table', () => {
    // Walk the table in source order and assert getReleaseVersion picks
    // the first release that lists the method.
    const firstSeen = new Map<MethodName, Version>();
    for (const version of Object.keys(releases) as Version[]) {
      for (const entry of releases[version] ?? []) {
        const name = (
          typeof entry === 'string' ? entry : entry.method
        ) as MethodName;
        if (!firstSeen.has(name)) firstSeen.set(name, version);
      }
    }
    for (const [method, expected] of firstSeen) {
      expect(getReleaseVersion(method)).toBe(expected);
    }
  });

  test('returns null for an unknown method', () => {
    expect(getReleaseVersion('unknown:method' as MethodName)).toBeNull();
  });
});

describe('getReleaseVersion — two-argument overload', () => {
  test('release table currently has no versioned-payload entries', () => {
    // This guards the assumption behind the abbreviated test surface
    // below. If someone ships a `{ method, param }` entry, this test
    // fails and the suite needs to grow back tests for the two-arg
    // overload (lookup by (method, param), null on miss, etc.).
    expect(versionedPayloadMethods).toEqual([]);
  });
});
