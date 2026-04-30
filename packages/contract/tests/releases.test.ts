import { describe, expect, test } from 'bun:test';

/**
 * Source-level assertions on the real releases table.
 *
 * `versions.test.ts` calls `mock.module(...)` to inject a fake releases map
 * for its unit tests, and that mock leaks across the shared Bun test module
 * graph. Reading the file as raw text bypasses the cache so we can still
 * validate that the actual release table ships the new entry.
 */
const releasesSource = await Bun.file(
  `${import.meta.dir}/../src/methods/versions/releases.ts`,
).text();

describe('real releases table', () => {
  test('1.5.0 entry registers notifications:permission.request', () => {
    const match = releasesSource.match(/'1\.5\.0':\s*\[([\s\S]*?)\]/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("'notifications:permission.request'");
  });
});
