import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  clearMockLaunchParams,
  getLaunchParams,
  LaunchParamsError,
  mockLaunchParamsForDev,
  parseLaunchParams,
  retrieveLaunchParams,
} from '../src/launch-params';

// Mock window with sessionStorage
let mockWindow: {
  __ALIEN_AUTH_TOKEN__?: string;
  __ALIEN_CONTRACT_VERSION__?: string;
  __ALIEN_HOST_VERSION__?: string;
  __ALIEN_PLATFORM__?: string;
  __ALIEN_START_PARAM__?: string;
};

let mockSessionStorage: Map<string, string>;

beforeEach(() => {
  mockWindow = {};
  mockSessionStorage = new Map();

  // Set up global window mock
  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    writable: true,
    configurable: true,
  });

  // Set up sessionStorage mock
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: (key: string) => mockSessionStorage.get(key) ?? null,
      setItem: (key: string, value: string) =>
        mockSessionStorage.set(key, value),
      removeItem: (key: string) => mockSessionStorage.delete(key),
      clear: () => mockSessionStorage.clear(),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
});

describe('retrieveLaunchParams', () => {
  test('returns params from window globals', () => {
    mockWindow.__ALIEN_AUTH_TOKEN__ = 'test-token';
    mockWindow.__ALIEN_CONTRACT_VERSION__ = '1.2.3';
    mockWindow.__ALIEN_HOST_VERSION__ = '2.0.0';
    mockWindow.__ALIEN_PLATFORM__ = 'ios';

    const params = retrieveLaunchParams();

    expect(params.authToken).toBe('test-token');
    expect(params.contractVersion).toBe('1.2.3');
    expect(params.hostAppVersion).toBe('2.0.0');
    expect(params.platform).toBe('ios');
  });

  test('persists to sessionStorage after retrieval', () => {
    mockWindow.__ALIEN_AUTH_TOKEN__ = 'test-token';
    mockWindow.__ALIEN_CONTRACT_VERSION__ = '1.2.3';

    retrieveLaunchParams();

    const stored = mockSessionStorage.get('alien/launchParams');
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored as string);
    expect(parsed.authToken).toBe('test-token');
    expect(parsed.contractVersion).toBe('1.2.3');
  });

  test('falls back to sessionStorage when window globals cleared', () => {
    // First, set up window globals and retrieve
    mockWindow.__ALIEN_AUTH_TOKEN__ = 'test-token';
    mockWindow.__ALIEN_CONTRACT_VERSION__ = '1.2.3';
    retrieveLaunchParams();

    // Clear window globals
    delete mockWindow.__ALIEN_AUTH_TOKEN__;
    delete mockWindow.__ALIEN_CONTRACT_VERSION__;

    // Should still work from sessionStorage
    const params = retrieveLaunchParams();
    expect(params.authToken).toBe('test-token');
    expect(params.contractVersion).toBe('1.2.3');
  });

  test('throws LaunchParamsError when no source available', () => {
    expect(() => retrieveLaunchParams()).toThrow(LaunchParamsError);
    expect(() => retrieveLaunchParams()).toThrow(
      'Launch params not available. Running outside Alien App? Use mockLaunchParamsForDev() for development.',
    );
  });

  test('returns undefined for optional fields when not provided', () => {
    mockWindow.__ALIEN_AUTH_TOKEN__ = 'test-token';
    // Not setting other globals

    const params = retrieveLaunchParams();

    expect(params.authToken).toBe('test-token');
    expect(params.contractVersion).toBeUndefined();
    expect(params.hostAppVersion).toBeUndefined();
    expect(params.platform).toBeUndefined();
  });
});

describe('getLaunchParams', () => {
  test('returns undefined when no source available (does not throw)', () => {
    const params = getLaunchParams();
    expect(params).toBeUndefined();
  });

  test('returns params when available', () => {
    mockWindow.__ALIEN_AUTH_TOKEN__ = 'test-token';

    const params = getLaunchParams();
    expect(params).toBeDefined();
    expect(params?.authToken).toBe('test-token');
  });
});

describe('parseLaunchParams', () => {
  test('parses valid JSON', () => {
    const raw = JSON.stringify({
      authToken: 'test-token',
      contractVersion: '1.2.3',
      hostAppVersion: '2.0.0',
      platform: 'android',
    });

    const params = parseLaunchParams(raw);

    expect(params.authToken).toBe('test-token');
    expect(params.contractVersion).toBe('1.2.3');
    expect(params.hostAppVersion).toBe('2.0.0');
    expect(params.platform).toBe('android');
  });

  test('validates version format (invalid becomes undefined)', () => {
    const raw = JSON.stringify({
      authToken: 'test-token',
      contractVersion: 'invalid-version',
    });

    const params = parseLaunchParams(raw);

    expect(params.authToken).toBe('test-token');
    expect(params.contractVersion).toBeUndefined();
  });

  test('validates platform values (invalid becomes undefined)', () => {
    const raw = JSON.stringify({
      authToken: 'test-token',
      platform: 'windows',
    });

    const params = parseLaunchParams(raw);

    expect(params.authToken).toBe('test-token');
    expect(params.platform).toBeUndefined();
  });

  test('accepts ios platform', () => {
    const params = parseLaunchParams(
      JSON.stringify({ authToken: 'test', platform: 'ios' }),
    );
    expect(params.platform).toBe('ios');
  });

  test('accepts android platform', () => {
    const params = parseLaunchParams(
      JSON.stringify({ authToken: 'test', platform: 'android' }),
    );
    expect(params.platform).toBe('android');
  });
});

describe('mockLaunchParamsForDev', () => {
  test('injects into window globals', () => {
    mockLaunchParamsForDev({
      authToken: 'mock-token',
      contractVersion: '0.0.1',
      hostAppVersion: '1.0.0',
      platform: 'ios',
    });

    expect(mockWindow.__ALIEN_AUTH_TOKEN__).toBe('mock-token');
    expect(mockWindow.__ALIEN_CONTRACT_VERSION__).toBe('0.0.1');
    expect(mockWindow.__ALIEN_HOST_VERSION__).toBe('1.0.0');
    expect(mockWindow.__ALIEN_PLATFORM__).toBe('ios');
  });

  test('logs warning to console', () => {
    const warnMock = mock(() => {});
    const originalWarn = console.warn;
    console.warn = warnMock;

    mockLaunchParamsForDev({ authToken: 'mock-token' });

    expect(warnMock).toHaveBeenCalledWith(
      '[@alien_org/bridge] Using mock launch params - dev mode',
    );

    console.warn = originalWarn;
  });

  test('params are retrievable via normal flow', () => {
    mockLaunchParamsForDev({
      authToken: 'mock-token',
      contractVersion: '0.0.1',
    });

    const params = retrieveLaunchParams();

    expect(params.authToken).toBe('mock-token');
    expect(params.contractVersion).toBe('0.0.1');
  });

  test('only sets provided fields', () => {
    mockLaunchParamsForDev({
      authToken: 'mock-token',
    });

    expect(mockWindow.__ALIEN_AUTH_TOKEN__).toBe('mock-token');
    expect(mockWindow.__ALIEN_CONTRACT_VERSION__).toBeUndefined();
    expect(mockWindow.__ALIEN_HOST_VERSION__).toBeUndefined();
    expect(mockWindow.__ALIEN_PLATFORM__).toBeUndefined();
  });
});

describe('clearMockLaunchParams', () => {
  test('removes window globals', () => {
    mockWindow.__ALIEN_AUTH_TOKEN__ = 'test-token';
    mockWindow.__ALIEN_CONTRACT_VERSION__ = '1.2.3';
    mockWindow.__ALIEN_HOST_VERSION__ = '2.0.0';
    mockWindow.__ALIEN_PLATFORM__ = 'ios';

    clearMockLaunchParams();

    expect(mockWindow.__ALIEN_AUTH_TOKEN__).toBeUndefined();
    expect(mockWindow.__ALIEN_CONTRACT_VERSION__).toBeUndefined();
    expect(mockWindow.__ALIEN_HOST_VERSION__).toBeUndefined();
    expect(mockWindow.__ALIEN_PLATFORM__).toBeUndefined();
  });

  test('removes sessionStorage entry', () => {
    mockSessionStorage.set(
      'alien/launchParams',
      JSON.stringify({ authToken: 'test' }),
    );

    clearMockLaunchParams();

    expect(mockSessionStorage.get('alien/launchParams')).toBeUndefined();
  });

  test('clears both window globals and sessionStorage', () => {
    mockWindow.__ALIEN_AUTH_TOKEN__ = 'test-token';
    mockSessionStorage.set(
      'alien/launchParams',
      JSON.stringify({ authToken: 'test' }),
    );

    clearMockLaunchParams();

    expect(mockWindow.__ALIEN_AUTH_TOKEN__).toBeUndefined();
    expect(mockSessionStorage.get('alien/launchParams')).toBeUndefined();
  });
});

describe('startParam', () => {
  test('retrieves startParam from window global', () => {
    mockWindow.__ALIEN_AUTH_TOKEN__ = 'test-token';
    mockWindow.__ALIEN_START_PARAM__ = 'referral123';

    const params = retrieveLaunchParams();

    expect(params.startParam).toBe('referral123');
  });

  test('passes through any value as-is', () => {
    mockWindow.__ALIEN_AUTH_TOKEN__ = 'test-token';
    mockWindow.__ALIEN_START_PARAM__ = 'any+value/with==chars';

    const params = retrieveLaunchParams();

    expect(params.startParam).toBe('any+value/with==chars');
  });

  test('mockLaunchParamsForDev injects startParam', () => {
    mockLaunchParamsForDev({
      authToken: 'mock-token',
      startParam: 'test_referral',
    });

    expect(mockWindow.__ALIEN_START_PARAM__).toBe('test_referral');
  });

  test('clearMockLaunchParams removes startParam', () => {
    mockWindow.__ALIEN_START_PARAM__ = 'test';

    clearMockLaunchParams();

    expect(mockWindow.__ALIEN_START_PARAM__).toBeUndefined();
  });

  test('startParam persists to sessionStorage', () => {
    mockWindow.__ALIEN_AUTH_TOKEN__ = 'test-token';
    mockWindow.__ALIEN_START_PARAM__ = 'persist_me';

    retrieveLaunchParams();

    const stored = mockSessionStorage.get('alien/launchParams');
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored as string);
    expect(parsed.startParam).toBe('persist_me');
  });

  test('startParam restores from sessionStorage', () => {
    mockSessionStorage.set(
      'alien/launchParams',
      JSON.stringify({ authToken: 'test', startParam: 'restored_param' }),
    );

    const params = retrieveLaunchParams();

    expect(params.startParam).toBe('restored_param');
  });
});

describe('SSR handling', () => {
  test('throws LaunchParamsError when window is undefined', () => {
    // Remove window
    delete (globalThis as { window?: unknown }).window;

    expect(() => retrieveLaunchParams()).toThrow(LaunchParamsError);
  });

  test('getLaunchParams returns undefined when window is undefined', () => {
    delete (globalThis as { window?: unknown }).window;

    const params = getLaunchParams();
    expect(params).toBeUndefined();
  });

  test('mockLaunchParamsForDev throws when window is undefined', () => {
    delete (globalThis as { window?: unknown }).window;

    expect(() => mockLaunchParamsForDev({ authToken: 'test' })).toThrow(
      'Cannot mock launch params: window is undefined',
    );
  });
});
