import { describe, expect, mock, test } from 'bun:test';
import type { MethodName } from '../src/methods/types/method-types';

/**
 * Mock releases data with versioned-payload entries on `ui:showModal`.
 * Mirrors the shape of `versions.test.ts` so the two suites can coexist
 * (both rely on `mock.module` of `../src/methods/versions/releases`).
 */
const mockReleases = {
  '0.0.9': ['app:ready'],
  '0.1.0': [
    'auth:request',
    'storage:get',
    { method: 'ui:showModal', param: 'basic' },
  ],
  '0.2.0': [
    'auth:request',
    'storage:get',
    'storage:set',
    { method: 'ui:showModal', param: 'basic' },
    { method: 'ui:showModal', param: 'extended' },
    'ui:hideModal',
  ],
  '1.0.0': [
    'auth:request',
    'storage:get',
    'storage:set',
    { method: 'ui:showModal', param: 'basic' },
    { method: 'ui:showModal', param: 'extended' },
    { method: 'ui:showModal', param: 'premium' },
    'ui:hideModal',
    'payment:init',
  ],
};

mock.module('../src/methods/versions/releases', () => ({
  releases: mockReleases,
}));

// `versions.test.ts` mocks the same module; re-import after the mock so
// the implementation here picks it up too.
const { getReleaseVersion } = await import(
  '../src/methods/versions/get-release-version'
);

describe('getReleaseVersion — single-argument overload', () => {
  test('returns the version that first declared the method', () => {
    expect(getReleaseVersion('app:ready' as unknown as MethodName)).toBe(
      '0.0.9',
    );
  });

  test('returns the version where a method with no payload first appeared', () => {
    expect(getReleaseVersion('auth:request' as unknown as MethodName)).toBe(
      '0.1.0',
    );
  });

  test('returns the first release for a method that was carried forward', () => {
    expect(getReleaseVersion('storage:get' as unknown as MethodName)).toBe(
      '0.1.0',
    );
  });

  test('returns the first release for a method added later', () => {
    expect(getReleaseVersion('payment:init' as unknown as MethodName)).toBe(
      '1.0.0',
    );
  });

  test('locates a method that exists only as an object entry (versioned payload)', () => {
    // ui:showModal never appears as a bare string, only inside
    // `{ method, param }` objects. The single-argument overload should
    // skip those entries because they aren't a plain method match.
    // Documented behaviour: returns `null` when the only references are
    // object-shaped (no string entry).
    expect(getReleaseVersion('ui:showModal' as unknown as MethodName)).toBe(
      null,
    );
  });

  test('returns null for an unknown method', () => {
    expect(
      getReleaseVersion('nonexistent:method' as unknown as MethodName),
    ).toBe(null);
  });
});

describe('getReleaseVersion — two-argument overload (versioned payload)', () => {
  test('returns the earliest release where the (method, param) pair appears', () => {
    expect(
      getReleaseVersion(
        'ui:showModal' as unknown as never,
        'basic' as unknown as never,
      ),
    ).toBe('0.1.0');
  });

  test('returns the release where a new param variant was introduced', () => {
    expect(
      getReleaseVersion(
        'ui:showModal' as unknown as never,
        'extended' as unknown as never,
      ),
    ).toBe('0.2.0');
  });

  test('returns the release where the latest param variant was added', () => {
    expect(
      getReleaseVersion(
        'ui:showModal' as unknown as never,
        'premium' as unknown as never,
      ),
    ).toBe('1.0.0');
  });

  test('returns null when the param has not been released', () => {
    expect(
      getReleaseVersion(
        'ui:showModal' as unknown as never,
        'never-shipped' as unknown as never,
      ),
    ).toBe(null);
  });

  test('returns null when the method exists but only as a bare string in releases', () => {
    // payment:init has no versioned-payload entries — passing a payload
    // should miss every release block.
    expect(
      getReleaseVersion(
        'payment:init' as unknown as never,
        'basic' as unknown as never,
      ),
    ).toBe(null);
  });
});
