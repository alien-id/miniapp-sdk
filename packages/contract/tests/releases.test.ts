import { describe, expect, test } from 'bun:test';
import type { MethodName } from '../src/methods/types/method-types';
import type { Version } from '../src/utils';

/**
 * Source-level assertions on the real releases table.
 *
 * `versions.test.ts` calls `mock.module(...)` to inject a fake releases map
 * for its unit tests, and that mock leaks across the shared Bun test module
 * graph. Reading the file as raw text bypasses the cache entirely so we can
 * still validate the real release table.
 */
const RELEASES_PATH = `${import.meta.dir}/../src/methods/versions/releases.ts`;
const releasesSource = await Bun.file(RELEASES_PATH).text();

/**
 * Every method that ships in the contract's `Methods` interface. Kept here
 * as a hand-maintained list so a forgotten release entry surfaces as a
 * failing test — TypeScript-only types are erased at runtime and cannot be
 * enumerated otherwise.
 */
const EXPECTED_METHODS: ReadonlySet<MethodName> = new Set([
  'app:ready',
  'app:close',
  'host.back.button:toggle',
  'payment:request',
  'clipboard:write',
  'clipboard:read',
  'link:open',
  'haptic:impact',
  'haptic:notification',
  'haptic:selection',
  'wallet.solana:connect',
  'wallet.solana:disconnect',
  'wallet.solana:sign.transaction',
  'wallet.solana:sign.message',
  'wallet.solana:sign.send',
  'notifications:permission.request',
]);

interface ParsedRelease {
  version: Version;
  methods: MethodName[];
}

/**
 * Parse the releases.ts source into a list of {version, methods[]} entries
 * without evaluating it. We use a coarse two-step regex:
 *   1. Find each `'X.Y.Z': [ … ],` block.
 *   2. Extract every `'method:name'` or `{ method: 'name', ... }` from
 *      inside the block.
 */
function parseReleases(source: string): ParsedRelease[] {
  const blocks = [
    ...source.matchAll(/'(\d+\.\d+\.\d+)':\s*\[([\s\S]*?)\]/g),
  ];
  return blocks.map((block) => {
    const version = block[1] as Version;
    const body = block[2] ?? '';
    const methods: MethodName[] = [];
    for (const m of body.matchAll(/'([^']+)'/g)) {
      // Inside a release-array block, every quoted string is a method
      // name (either bare or as the value of an object `method: '...'`
      // field — there is no `param` key in the current source).
      methods.push(m[1] as MethodName);
    }
    return { version, methods };
  });
}

const parsed = parseReleases(releasesSource);

function compareVersions(a: Version, b: Version): number {
  const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
  const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
  if (aMajor !== bMajor) return (aMajor ?? 0) - (bMajor ?? 0);
  if (aMinor !== bMinor) return (aMinor ?? 0) - (bMinor ?? 0);
  return (aPatch ?? 0) - (bPatch ?? 0);
}

describe('real releases table — source-level guards', () => {
  test('1.5.0 entry registers notifications:permission.request', () => {
    const match = releasesSource.match(/'1\.5\.0':\s*\[([\s\S]*?)\]/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("'notifications:permission.request'");
  });

  test('parsed at least one release block', () => {
    expect(parsed.length).toBeGreaterThan(0);
  });

  test('every release version is valid semver', () => {
    const semver = /^\d+\.\d+\.\d+$/;
    for (const { version } of parsed) {
      expect(version, `Invalid semver: ${version}`).toMatch(semver);
    }
  });

  test('every release has at least one method', () => {
    for (const { version, methods } of parsed) {
      expect(methods.length, `Release ${version} is empty`).toBeGreaterThan(0);
    }
  });

  test('no method is duplicated within a single release', () => {
    for (const { version, methods } of parsed) {
      const unique = new Set(methods);
      expect(unique.size, `Duplicate method in release ${version}`).toBe(
        methods.length,
      );
    }
  });

  test('every method declared in releases is in the expected set', () => {
    for (const { version, methods } of parsed) {
      for (const m of methods) {
        expect(
          EXPECTED_METHODS.has(m),
          `Release ${version} declares "${m}", which is not in the expected registry`,
        ).toBe(true);
      }
    }
  });

  test('every expected method has a release entry', () => {
    const released = new Set<MethodName>();
    for (const { methods } of parsed) {
      for (const m of methods) released.add(m);
    }
    for (const name of EXPECTED_METHODS) {
      expect(
        released.has(name),
        `Method "${name}" is declared in Methods but has no release entry`,
      ).toBe(true);
    }
  });

  test('no method is declared in two different releases', () => {
    const firstSeen = new Map<MethodName, Version>();
    for (const { version, methods } of parsed) {
      for (const m of methods) {
        if (firstSeen.has(m)) {
          throw new Error(
            `Method "${m}" appears in both ${firstSeen.get(m)} and ${version}`,
          );
        }
        firstSeen.set(m, version);
      }
    }
  });

  test('release versions are stored in ascending order in source', () => {
    const versions = parsed.map((p) => p.version);
    const sorted = [...versions].sort(compareVersions);
    expect(versions).toEqual(sorted);
  });

  test('payment:request belongs to release 0.1.1', () => {
    const release = parsed.find((p) => p.methods.includes('payment:request'));
    expect(release?.version).toBe('0.1.1');
  });

  test('wallet.solana:* methods all live in release 1.0.0', () => {
    const walletMethods = parsed.flatMap((p) =>
      p.methods
        .filter((m) => m.startsWith('wallet.solana:'))
        .map((m) => ({ version: p.version, m })),
    );
    expect(walletMethods.length).toBeGreaterThan(0);
    for (const { version, m } of walletMethods) {
      expect(version, `${m} is in release ${version}, expected 1.0.0`).toBe(
        '1.0.0',
      );
    }
  });

  test('notifications:permission.request is the only entry below v2 in 1.5.0', () => {
    const release150 = parsed.find((p) => p.version === '1.5.0');
    expect(release150?.methods).toEqual(['notifications:permission.request']);
  });
});
