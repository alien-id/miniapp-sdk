import { describe, expect, test } from 'bun:test';
import type { MethodName, Version } from '../src';
import {
  getMethodMinVersion,
  getReleaseVersion,
  METHOD_NAMES,
  releases,
} from '../src';
import { selectReleaseVersion } from '../src/methods/versions/get-release-version';

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

  test('agrees with getMethodMinVersion for every method', () => {
    // Both APIs answer "earliest release that introduced this method" and
    // must never diverge. getMethodMinVersion walks a semver-sorted list;
    // getReleaseVersion must use the same ordering, not raw key order.
    for (const method of METHOD_NAMES) {
      expect(getReleaseVersion(method)).toBe(
        getMethodMinVersion(method) as Version,
      );
    }
  });
});

describe('selectReleaseVersion — ordering is semver, not table key order', () => {
  test('returns the semver-earliest release regardless of key insertion order', () => {
    // Authored deliberately out of semver order: the later release is keyed
    // first. Raw Object.keys order would pick '1.0.0'; semver order picks
    // '0.1.0'. This is the divergence that desynced getReleaseVersion from
    // getMethodMinVersion.
    const method = 'late:method' as MethodName;
    const table: Record<string, MethodName[]> = {
      '1.0.0': [method],
      '0.1.0': [method],
    };
    expect(selectReleaseVersion(table, method)).toBe('0.1.0');
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
