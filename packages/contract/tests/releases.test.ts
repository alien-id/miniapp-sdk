import { describe, expect, test } from 'bun:test';
import type { MethodName, Version } from '../src';
import { METHOD_NAMES, releases } from '../src';

/**
 * Source-level guards on the real {@link releases} table.
 *
 * With `versions.test.ts` and `get-release-version.test.ts` no longer
 * mocking the releases module, the import below picks up the real
 * data directly — no regex parsing required.
 */

function compareVersions(a: Version, b: Version): number {
  const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
  const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
  if (aMajor !== bMajor) return (aMajor ?? 0) - (bMajor ?? 0);
  if (aMinor !== bMinor) return (aMinor ?? 0) - (bMinor ?? 0);
  return (aPatch ?? 0) - (bPatch ?? 0);
}

function entryName(entry: (typeof releases)[Version][number]): MethodName {
  return (typeof entry === 'string' ? entry : entry.method) as MethodName;
}

const versions = Object.keys(releases) as Version[];

describe('releases — structural guards', () => {
  test('contains at least one release', () => {
    expect(versions.length).toBeGreaterThan(0);
  });

  test('every release version is valid semver (major.minor.patch)', () => {
    const semver = /^\d+\.\d+\.\d+$/;
    for (const v of versions) {
      expect(v, `invalid semver: ${v}`).toMatch(semver);
    }
  });

  test('every release lists at least one method', () => {
    for (const v of versions) {
      expect(releases[v]?.length, `release ${v} is empty`).toBeGreaterThan(0);
    }
  });

  test('release versions are stored in ascending source order', () => {
    expect(versions).toEqual([...versions].sort(compareVersions));
  });
});

describe('releases — method coverage', () => {
  test('no method is listed twice within the same release', () => {
    for (const v of versions) {
      const names = (releases[v] ?? []).map(entryName);
      expect(new Set(names).size, `duplicate method in release ${v}`).toBe(
        names.length,
      );
    }
  });

  test('no method is declared in two different releases', () => {
    const firstSeen = new Map<MethodName, Version>();
    for (const v of versions) {
      for (const entry of releases[v] ?? []) {
        const name = entryName(entry);
        const prior = firstSeen.get(name);
        if (prior) {
          throw new Error(`${name} appears in both ${prior} and ${v}`);
        }
        firstSeen.set(name, v);
      }
    }
  });

  test('every released method is declared in the contract', () => {
    const contractMethods = new Set<MethodName>(METHOD_NAMES);
    for (const v of versions) {
      for (const entry of releases[v] ?? []) {
        const name = entryName(entry);
        expect(
          contractMethods.has(name),
          `release ${v} declares "${name}", which is not in the Methods interface`,
        ).toBe(true);
      }
    }
  });

  test('every contract method has a release entry', () => {
    const released = new Set<MethodName>();
    for (const v of versions) {
      for (const entry of releases[v] ?? []) released.add(entryName(entry));
    }
    for (const method of METHOD_NAMES) {
      expect(
        released.has(method),
        `${method} is declared in Methods but has no release entry`,
      ).toBe(true);
    }
  });
});
