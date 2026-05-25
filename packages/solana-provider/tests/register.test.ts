import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { BridgeDriver } from './test-utils';

const registerWalletMock = mock(() => {});
mock.module('@wallet-standard/wallet', () => ({
  registerWallet: registerWalletMock,
}));

const driver = new BridgeDriver();

beforeEach(async () => {
  registerWalletMock.mockClear();
  driver.uninstall();
  const { _resetRegistration } = await import('../src/register');
  _resetRegistration();
});

afterEach(() => {
  driver.uninstall();
});

describe('initAlienWallet', () => {
  test('registers wallet when bridge is available and method is supported', async () => {
    driver.install({ contractVersion: '1.0.0' });
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(1);
  });

  test('does not register twice', async () => {
    driver.install({ contractVersion: '1.0.0' });
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(1);
  });

  test('does not register when bridge is unavailable', async () => {
    // No driver.install() — `__miniAppsBridge__` is absent, so callability
    // returns { callable: false, reason: 'no-bridge' }. window itself must
    // still exist so the SSR short-circuit doesn't fire first.
    driver.setupWindow();
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(0);
  });

  test('registers when contractVersion is missing', async () => {
    // No contractVersion → callability skips the version check and reports
    // `{ callable: true }` purely on bridge presence.
    driver.install();
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(1);
  });

  test('does not register when wallet method is unsupported', async () => {
    // wallet.solana:connect lives in the 1.0.0 release; 0.2.4 is below it.
    driver.install({ contractVersion: '0.2.4' });
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(0);
  });

  test('warns when host Contract Version is too old', async () => {
    const warnSpy = mock(() => {});
    const originalWarn = console.warn;
    console.warn = warnSpy;
    try {
      driver.install({ contractVersion: '0.2.4' });
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
      driver.setupWindow();
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
