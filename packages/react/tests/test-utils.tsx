import type { Version } from '@alien-id/miniapps-contract';
import type { ReactNode } from 'react';
import { AlienContext, AlienProvider } from '../src/context';

/**
 * Inject Bridge + launch-param globals on the JSDOM/happy-dom window the
 * same way the Host App would in production. Every input is explicit so
 * tests can model edge cases like "auth token present, Contract Version
 * missing." Always writes a full state — never leaves stale globals from
 * a previous test.
 *
 * - `bridge: true` → injects `window.__miniAppsBridge__`. Default false.
 * - `contractVersion` → sets `__ALIEN_CONTRACT_VERSION__` when supplied;
 *   deletes the global when omitted.
 * - `authToken` → sets `__ALIEN_AUTH_TOKEN__` when supplied. Defaults to
 *   `'test-token'` whenever a `contractVersion` is supplied (so launch
 *   params resolve), and deletes the global when both are omitted.
 */
export function setBridgeEnvironment(opts: {
  bridge?: boolean;
  contractVersion?: string;
  authToken?: string;
}): void {
  const w = window as unknown as Record<string, unknown>;

  if (opts.bridge) {
    w.__miniAppsBridge__ = { postMessage: () => {} };
  } else {
    delete w.__miniAppsBridge__;
  }

  // Launch params: auth token is the gating field — without it,
  // `retrieveFromWindow` returns null and no params are read. Default to
  // a test token whenever a contractVersion is supplied so the common
  // case is one-liner.
  const authToken =
    opts.authToken ??
    (opts.contractVersion !== undefined ? 'test-token' : undefined);
  if (authToken !== undefined) {
    w.__ALIEN_AUTH_TOKEN__ = authToken;
  } else {
    delete w.__ALIEN_AUTH_TOKEN__;
  }

  if (opts.contractVersion !== undefined) {
    w.__ALIEN_CONTRACT_VERSION__ = opts.contractVersion;
  } else {
    delete w.__ALIEN_CONTRACT_VERSION__;
  }
}

/**
 * Purge every window global the bridge consumes plus the sessionStorage
 * cache that survives between reads. Call from `beforeEach`/`afterEach`
 * to keep tests independent.
 */
export function clearBridgeEnvironment(): void {
  const w = window as unknown as Record<string, unknown>;
  delete w.__miniAppsBridge__;
  delete w.__ALIEN_AUTH_TOKEN__;
  delete w.__ALIEN_CONTRACT_VERSION__;
  delete w.__ALIEN_HOST_VERSION__;
  delete w.__ALIEN_PLATFORM__;
  delete w.__ALIEN_SAFE_AREA_INSETS__;
  delete w.__ALIEN_START_PARAM__;
  delete w.__ALIEN_DISPLAY_MODE__;
  try {
    window.sessionStorage.clear();
  } catch {
    // Ignore in environments without sessionStorage.
  }
}

/**
 * `renderHook` wrapper that mounts `AlienProvider` with side effects
 * disabled (no auto-ready emit, no link interceptor) so tests stay
 * deterministic.
 */
export function BridgeTestWrapper({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <AlienProvider autoReady={false} interceptLinks={false}>
      {children}
    </AlienProvider>
  );
}

/**
 * Test-only provider that drives `AlienContext` from explicit props so
 * tests can flip context values across `rerender()` without touching
 * window globals. Use this when the test cares about a context change
 * mid-test (e.g. asserting that a hook re-evaluates when
 * `contractVersion` updates); use `BridgeTestWrapper` for everything
 * else.
 */
export function ControllableAlienProvider({
  bridgeAvailable,
  contractVersion,
  authToken = 'test-token',
  children,
}: {
  bridgeAvailable: boolean;
  contractVersion: Version | undefined;
  authToken?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <AlienContext.Provider
      value={{
        authToken,
        contractVersion,
        isBridgeAvailable: bridgeAvailable,
        ready: () => {},
      }}
    >
      {children}
    </AlienContext.Provider>
  );
}
