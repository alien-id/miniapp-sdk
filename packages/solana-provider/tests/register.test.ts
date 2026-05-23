import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
  WALLET_ERROR_MOCK,
} from './test-utils';

const registerWalletMock = mock(() => {});
const getLaunchParamsMock = mock(
  (): { contractVersion?: string } | undefined => undefined,
);
type CallabilityResult =
  | { callable: true }
  | { callable: false; reason: 'no-bridge' }
  | { callable: false; reason: 'host-outdated'; needs: string; has: string };
const callabilityMock = mock(
  (): CallabilityResult => ({ callable: false, reason: 'no-bridge' }),
);

mock.module('@wallet-standard/wallet', () => ({
  registerWallet: registerWalletMock,
}));

mock.module('@alien-id/miniapps-bridge', () => ({
  BridgeMethodUnsupportedError,
  BridgeUnavailableError,
  BridgeTimeoutError,
  getLaunchParams: getLaunchParamsMock,
  callability: callabilityMock,
  request: mock(() => Promise.resolve({})),
  send: Object.assign(
    mock(() => {}),
    {
      ifAvailable: mock(() => ({ ok: true, data: undefined })),
    },
  ),
}));

mock.module('@alien-id/miniapps-contract', () => ({
  WALLET_ERROR: WALLET_ERROR_MOCK,
}));

describe('initAlienWallet', () => {
  beforeEach(async () => {
    registerWalletMock.mockClear();
    getLaunchParamsMock.mockReset();
    callabilityMock.mockReset();
    getLaunchParamsMock.mockReturnValue(undefined);
    callabilityMock.mockReturnValue({ callable: false, reason: 'no-bridge' });

    // Bun's test runtime does not define `window` by default. The provider
    // gates on `typeof window === 'undefined'` for SSR-safety, so every test
    // that exercises the bridge path needs a stand-in window. Tests that
    // explicitly check the SSR branch delete it again.
    (globalThis as { window?: unknown }).window = globalThis;

    const { _resetRegistration } = await import('../src/register');
    _resetRegistration();
  });

  test('registers wallet when bridge is available and method is supported', async () => {
    getLaunchParamsMock.mockReturnValue({ contractVersion: '1.0.0' });
    callabilityMock.mockReturnValue({ callable: true });
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(1);
  });

  test('does not register twice', async () => {
    getLaunchParamsMock.mockReturnValue({ contractVersion: '1.0.0' });
    callabilityMock.mockReturnValue({ callable: true });
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(1);
  });

  test('does not register when bridge is unavailable', async () => {
    callabilityMock.mockReturnValue({ callable: false, reason: 'no-bridge' });
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(0);
  });

  test('registers when contractVersion is missing', async () => {
    callabilityMock.mockReturnValue({ callable: true });
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(1);
  });

  test('does not register when wallet method is unsupported', async () => {
    getLaunchParamsMock.mockReturnValue({ contractVersion: '0.2.4' });
    callabilityMock.mockReturnValue({
      callable: false,
      reason: 'host-outdated',
      needs: '1.0.0',
      has: '0.2.4',
    });
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(0);
  });

  test('warns when host Contract Version is too old', async () => {
    const warnSpy = mock(() => {});
    const originalWarn = console.warn;
    console.warn = warnSpy;
    try {
      getLaunchParamsMock.mockReturnValue({ contractVersion: '0.2.4' });
      callabilityMock.mockReturnValue({
        callable: false,
        reason: 'host-outdated',
        needs: '1.0.0',
        has: '0.2.4',
      });
      const { initAlienWallet } = await import('../src/register');
      initAlienWallet();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = ((warnSpy.mock.calls[0] as unknown[] | undefined)?.[0] ??
        '') as string;
      expect(message).toContain('1.0.0');
      expect(message).toContain('0.2.4');
      expect(message).toContain('[@alien-id/miniapps-solana-provider]');
    } finally {
      console.warn = originalWarn;
    }
  });

  test('does not warn when bridge is simply unavailable', async () => {
    const warnSpy = mock(() => {});
    const originalWarn = console.warn;
    console.warn = warnSpy;
    try {
      callabilityMock.mockReturnValue({ callable: false, reason: 'no-bridge' });
      const { initAlienWallet } = await import('../src/register');
      initAlienWallet();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(registerWalletMock).toHaveBeenCalledTimes(0);
    } finally {
      console.warn = originalWarn;
    }
  });

  test('does not throw or register when called in SSR (no window)', async () => {
    // Simulate SSR: no window global. The provider must short-circuit so
    // server-rendered apps that ship `initAlienWallet()` in their entry do
    // not crash before the bridge can ever exist.
    const originalWindow = (globalThis as { window?: unknown }).window;
    delete (globalThis as { window?: unknown }).window;
    try {
      const { initAlienWallet } = await import('../src/register');
      expect(() => initAlienWallet()).not.toThrow();
      expect(registerWalletMock).toHaveBeenCalledTimes(0);
    } finally {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });
});
