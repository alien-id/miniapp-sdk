import { describe, expect, mock, test } from 'bun:test';
import type { MethodName } from '../src/methods/types/method-types';

/**
 * Mock releases data for testing.
 * Simulates a realistic versioning scenario with:
 * - Simple method strings
 * - Versioned field objects (method + param)
 * - Methods added across multiple versions
 */
const mockReleases = {
  '0.0.1': ['auth:request', 'storage:get'],
  '0.0.9': ['auth:request', 'storage:get', 'app:ready'],
  '0.1.0': [
    'auth:request',
    'auth:logout',
    'storage:get',
    'storage:set',
    'app:ready',
    { method: 'ui:showModal', param: 'basic' },
  ],
  '0.2.0': [
    'auth:request',
    'auth:logout',
    'storage:get',
    'storage:set',
    'app:ready',
    { method: 'ui:showModal', param: 'basic' },
    { method: 'ui:showModal', param: 'extended' },
    'ui:hideModal',
  ],
  '1.0.0': [
    'auth:request',
    'auth:logout',
    'storage:get',
    'storage:set',
    'app:ready',
    { method: 'ui:showModal', param: 'basic' },
    { method: 'ui:showModal', param: 'extended' },
    { method: 'ui:showModal', param: 'premium' },
    'ui:hideModal',
    'payment:init',
  ],
};

// Mock the releases module before importing the functions
mock.module('../src/methods/versions/releases', () => ({
  releases: mockReleases,
}));

// Import real implementations after mocking
const { isMethodSupported, getMethodMinVersion } = await import(
  '../src/methods/versions'
);

// Type helper for mocked method names
type MockMethodName =
  | 'auth:request'
  | 'auth:logout'
  | 'storage:get'
  | 'storage:set'
  | 'app:ready'
  | 'ui:showModal'
  | 'ui:hideModal'
  | 'payment:init';

describe('isMethodSupported', () => {
  describe('version 0.0.1', () => {
    test('auth:request is supported', () => {
      expect(
        isMethodSupported('auth:request' as unknown as MethodName, '0.0.1'),
      ).toBe(true);
    });

    test('storage:get is supported', () => {
      expect(
        isMethodSupported('storage:get' as unknown as MethodName, '0.0.1'),
      ).toBe(true);
    });

    test('auth:logout is NOT supported', () => {
      expect(
        isMethodSupported('auth:logout' as unknown as MethodName, '0.0.1'),
      ).toBe(false);
    });

    test('storage:set is NOT supported', () => {
      expect(
        isMethodSupported('storage:set' as unknown as MethodName, '0.0.1'),
      ).toBe(false);
    });

    test('ui:showModal is NOT supported', () => {
      expect(
        isMethodSupported('ui:showModal' as unknown as MethodName, '0.0.1'),
      ).toBe(false);
    });

    test('payment:init is NOT supported', () => {
      expect(
        isMethodSupported('payment:init' as unknown as MethodName, '0.0.1'),
      ).toBe(false);
    });

    test('app:ready is NOT supported', () => {
      expect(
        isMethodSupported('app:ready' as unknown as MethodName, '0.0.1'),
      ).toBe(false);
    });
  });

  describe('version 0.0.9', () => {
    test('app:ready is supported (newly added)', () => {
      expect(
        isMethodSupported('app:ready' as unknown as MethodName, '0.0.9'),
      ).toBe(true);
    });

    test('auth:request is still supported', () => {
      expect(
        isMethodSupported('auth:request' as unknown as MethodName, '0.0.9'),
      ).toBe(true);
    });

    test('storage:get is still supported', () => {
      expect(
        isMethodSupported('storage:get' as unknown as MethodName, '0.0.9'),
      ).toBe(true);
    });
  });

  describe('version 0.1.0', () => {
    test('auth:logout is supported (newly added)', () => {
      expect(
        isMethodSupported('auth:logout' as unknown as MethodName, '0.1.0'),
      ).toBe(true);
    });

    test('storage:set is supported (newly added)', () => {
      expect(
        isMethodSupported('storage:set' as unknown as MethodName, '0.1.0'),
      ).toBe(true);
    });

    test('ui:showModal is supported (versioned field)', () => {
      expect(
        isMethodSupported('ui:showModal' as unknown as MethodName, '0.1.0'),
      ).toBe(true);
    });

    test('ui:hideModal is NOT supported yet', () => {
      expect(
        isMethodSupported('ui:hideModal' as unknown as MethodName, '0.1.0'),
      ).toBe(false);
    });
  });

  describe('version 0.2.0', () => {
    test('ui:hideModal is supported (newly added)', () => {
      expect(
        isMethodSupported('ui:hideModal' as unknown as MethodName, '0.2.0'),
      ).toBe(true);
    });

    test('payment:init is NOT supported yet', () => {
      expect(
        isMethodSupported('payment:init' as unknown as MethodName, '0.2.0'),
      ).toBe(false);
    });
  });

  describe('version 1.0.0', () => {
    test('payment:init is supported (newly added)', () => {
      expect(
        isMethodSupported('payment:init' as unknown as MethodName, '1.0.0'),
      ).toBe(true);
    });

    test('all methods are supported', () => {
      const methods: MockMethodName[] = [
        'auth:request',
        'auth:logout',
        'storage:get',
        'storage:set',
        'app:ready',
        'ui:showModal',
        'ui:hideModal',
        'payment:init',
      ];
      for (const method of methods) {
        expect(
          isMethodSupported(method as unknown as MethodName, '1.0.0'),
        ).toBe(true);
      }
    });
  });

  describe('unknown versions', () => {
    test('returns true for future version (semver: version >= minVersion)', () => {
      expect(
        isMethodSupported('auth:request' as unknown as MethodName, '99.99.99'),
      ).toBe(true);
    });

    test('returns false for version before method was added', () => {
      expect(
        isMethodSupported('auth:request' as unknown as MethodName, '0.0.0'),
      ).toBe(false);
    });

    test('returns true for version between releases (semver: 0.0.5 >= 0.0.1)', () => {
      expect(
        isMethodSupported('auth:request' as unknown as MethodName, '0.0.5'),
      ).toBe(true);
    });
  });
});

describe('getMethodMinVersion', () => {
  describe('methods from v0.0.1', () => {
    test('returns 0.0.1 for auth:request', () => {
      expect(getMethodMinVersion('auth:request' as unknown as MethodName)).toBe(
        '0.0.1',
      );
    });

    test('returns 0.0.1 for storage:get', () => {
      expect(getMethodMinVersion('storage:get' as unknown as MethodName)).toBe(
        '0.0.1',
      );
    });
  });

  describe('methods from v0.1.0', () => {
    test('returns 0.1.0 for auth:logout', () => {
      expect(getMethodMinVersion('auth:logout' as unknown as MethodName)).toBe(
        '0.1.0',
      );
    });

    test('returns 0.1.0 for storage:set', () => {
      expect(getMethodMinVersion('storage:set' as unknown as MethodName)).toBe(
        '0.1.0',
      );
    });

    test('returns 0.1.0 for ui:showModal (versioned field)', () => {
      expect(getMethodMinVersion('ui:showModal' as unknown as MethodName)).toBe(
        '0.1.0',
      );
    });
  });

  describe('methods from v0.2.0', () => {
    test('returns 0.2.0 for ui:hideModal', () => {
      expect(getMethodMinVersion('ui:hideModal' as unknown as MethodName)).toBe(
        '0.2.0',
      );
    });
  });

  describe('methods from v0.0.9', () => {
    test('returns 0.0.9 for app:ready', () => {
      expect(getMethodMinVersion('app:ready' as unknown as MethodName)).toBe(
        '0.0.9',
      );
    });
  });

  describe('methods from v1.0.0', () => {
    test('returns 1.0.0 for payment:init', () => {
      expect(getMethodMinVersion('payment:init' as unknown as MethodName)).toBe(
        '1.0.0',
      );
    });
  });

  describe('non-existent methods', () => {
    test('returns undefined for unknown method', () => {
      expect(
        getMethodMinVersion('nonexistent:method' as unknown as MethodName),
      ).toBeUndefined();
    });

    test('returns undefined for empty string', () => {
      expect(getMethodMinVersion('' as unknown as MethodName)).toBeUndefined();
    });
  });
});

describe('versioned fields (method + param)', () => {
  describe('ui:showModal with different params across versions', () => {
    test('basic param: method supported from v0.1.0', () => {
      // The method itself is supported (versioned field counts as method support)
      expect(
        isMethodSupported('ui:showModal' as unknown as MethodName, '0.1.0'),
      ).toBe(true);
      expect(
        isMethodSupported('ui:showModal' as unknown as MethodName, '0.2.0'),
      ).toBe(true);
      expect(
        isMethodSupported('ui:showModal' as unknown as MethodName, '1.0.0'),
      ).toBe(true);
    });

    test('method not supported before versioned field was added', () => {
      expect(
        isMethodSupported('ui:showModal' as unknown as MethodName, '0.0.1'),
      ).toBe(false);
    });

    test('getMethodMinVersion returns first version with any param', () => {
      // Should return 0.1.0 because that's when ui:showModal first appeared (with basic param)
      expect(getMethodMinVersion('ui:showModal' as unknown as MethodName)).toBe(
        '0.1.0',
      );
    });
  });
});

describe('version sorting behavior', () => {
  test('methods available in earlier versions are found first', () => {
    // auth:request exists in all versions, should return earliest
    expect(getMethodMinVersion('auth:request' as unknown as MethodName)).toBe(
      '0.0.1',
    );
  });

  test('correctly identifies version for method added later', () => {
    // payment:init only exists in 1.0.0
    expect(getMethodMinVersion('payment:init' as unknown as MethodName)).toBe(
      '1.0.0',
    );
  });
});

describe('backward compatibility', () => {
  test('methods from earlier versions remain supported in later versions', () => {
    // auth:request from v0.0.1 should work in all versions
    expect(
      isMethodSupported('auth:request' as unknown as MethodName, '0.0.1'),
    ).toBe(true);
    expect(
      isMethodSupported('auth:request' as unknown as MethodName, '0.1.0'),
    ).toBe(true);
    expect(
      isMethodSupported('auth:request' as unknown as MethodName, '0.2.0'),
    ).toBe(true);
    expect(
      isMethodSupported('auth:request' as unknown as MethodName, '1.0.0'),
    ).toBe(true);
  });

  test('storage:get from v0.0.1 available in all versions', () => {
    expect(
      isMethodSupported('storage:get' as unknown as MethodName, '0.0.1'),
    ).toBe(true);
    expect(
      isMethodSupported('storage:get' as unknown as MethodName, '0.1.0'),
    ).toBe(true);
    expect(
      isMethodSupported('storage:get' as unknown as MethodName, '0.2.0'),
    ).toBe(true);
    expect(
      isMethodSupported('storage:get' as unknown as MethodName, '1.0.0'),
    ).toBe(true);
  });
});
