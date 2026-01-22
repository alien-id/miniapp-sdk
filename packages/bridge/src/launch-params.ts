import type { LaunchParams, Platform, Version } from '@alien-id/contract';
import { PLATFORMS } from '@alien-id/contract';

declare global {
  interface Window {
    __ALIEN_AUTH_TOKEN__?: string;
    __ALIEN_CONTRACT_VERSION__?: string;
    __ALIEN_HOST_VERSION__?: string;
    __ALIEN_PLATFORM__?: string;
    __ALIEN_START_PARAM__?: string;
  }
}

const SESSION_STORAGE_KEY = 'alien/launchParams';

/**
 * Error thrown when launch params cannot be retrieved.
 */
export class LaunchParamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LaunchParamsError';
  }
}

function validateVersion(value: string | undefined): Version | undefined {
  if (!value) return undefined;
  return /^\d+\.\d+\.\d+$/.test(value) ? (value as Version) : undefined;
}

function validatePlatform(value: string | undefined): Platform | undefined {
  if (!value) return undefined;
  return PLATFORMS.includes(value as Platform)
    ? (value as Platform)
    : undefined;
}

function retrieveFromWindow(): LaunchParams | null {
  if (typeof window === 'undefined') return null;

  // Must have at least authToken to consider valid (primary identifier)
  if (window.__ALIEN_AUTH_TOKEN__ === undefined) return null;

  return {
    authToken: window.__ALIEN_AUTH_TOKEN__,
    contractVersion: validateVersion(window.__ALIEN_CONTRACT_VERSION__),
    hostAppVersion: window.__ALIEN_HOST_VERSION__,
    platform: validatePlatform(window.__ALIEN_PLATFORM__),
    startParam: window.__ALIEN_START_PARAM__,
  };
}

function retrieveFromSessionStorage(): LaunchParams | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return parseLaunchParams(raw);
  } catch {
    return null;
  }
}

function persistToSessionStorage(params: LaunchParams): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(params));
  } catch {
    // Silently fail - storage might be full or disabled
  }
}

/**
 * Parse launch params from JSON string.
 */
export function parseLaunchParams(raw: string): LaunchParams {
  const parsed = JSON.parse(raw);
  return {
    authToken: parsed.authToken,
    contractVersion: validateVersion(parsed.contractVersion),
    hostAppVersion: parsed.hostAppVersion,
    platform: validatePlatform(parsed.platform),
    startParam: parsed.startParam,
  };
}

/**
 * Inject mock launch params for development/testing.
 * Injects directly into window globals (same as host app would).
 * WARNING: Only use in development environments.
 */
export function mockLaunchParamsForDev(params: Partial<LaunchParams>): void {
  if (typeof window === 'undefined') {
    throw new LaunchParamsError(
      'Cannot mock launch params: window is undefined',
    );
  }

  console.warn('[@alien-id/bridge] Using mock launch params - dev mode');

  // Inject directly into window globals (same as host app)
  if (params.authToken !== undefined) {
    window.__ALIEN_AUTH_TOKEN__ = params.authToken;
  }
  if (params.contractVersion !== undefined) {
    window.__ALIEN_CONTRACT_VERSION__ = params.contractVersion;
  }
  if (params.hostAppVersion !== undefined) {
    window.__ALIEN_HOST_VERSION__ = params.hostAppVersion;
  }
  if (params.platform !== undefined) {
    window.__ALIEN_PLATFORM__ = params.platform;
  }
  if (params.startParam !== undefined) {
    window.__ALIEN_START_PARAM__ = params.startParam;
  }
}

/**
 * Clear mock launch params from window globals and sessionStorage.
 */
export function clearMockLaunchParams(): void {
  if (typeof window !== 'undefined') {
    delete window.__ALIEN_AUTH_TOKEN__;
    delete window.__ALIEN_CONTRACT_VERSION__;
    delete window.__ALIEN_HOST_VERSION__;
    delete window.__ALIEN_PLATFORM__;
    delete window.__ALIEN_START_PARAM__;
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Retrieve launch params from available sources.
 * @throws LaunchParamsError if no source available
 */
export function retrieveLaunchParams(): LaunchParams {
  // Try window globals first (primary source)
  const fromWindow = retrieveFromWindow();
  if (fromWindow) {
    persistToSessionStorage(fromWindow);
    return fromWindow;
  }

  // Fallback to sessionStorage (survives reloads)
  const fromStorage = retrieveFromSessionStorage();
  if (fromStorage) {
    return fromStorage;
  }

  // Strict: throw error when params unavailable
  throw new LaunchParamsError(
    'Launch params not available. Running outside Alien App? Use mockLaunchParamsForDev() for development.',
  );
}

/**
 * Try to get launch params, returns undefined if unavailable.
 */
export function getLaunchParams(): LaunchParams | undefined {
  try {
    return retrieveLaunchParams();
  } catch {
    return undefined;
  }
}
