import { beforeEach, describe, expect, mock, test } from 'bun:test';

const registerWalletMock = mock(() => {});
const isBridgeAvailableMock = mock(() => false);
const getLaunchParamsMock = mock(
  (): { contractVersion?: string } | undefined => undefined,
);
const isMethodSupportedMock = mock(() => false);

mock.module('@wallet-standard/wallet', () => ({
  registerWallet: registerWalletMock,
}));

mock.module('@alien-id/miniapps-bridge', () => ({
  isBridgeAvailable: isBridgeAvailableMock,
  getLaunchParams: getLaunchParamsMock,
  request: mock(() => Promise.resolve({})),
  send: Object.assign(
    mock(() => {}),
    {
      ifAvailable: mock(() => ({ ok: true, data: undefined })),
    },
  ),
  BridgeTimeoutError: class extends Error {},
}));

mock.module('@alien-id/miniapps-contract', () => ({
  isMethodSupported: isMethodSupportedMock,
  WALLET_ERROR: {
    USER_REJECTED: 5000,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    REQUEST_EXPIRED: 8000,
  },
}));

describe('initAlienWallet', () => {
  beforeEach(async () => {
    registerWalletMock.mockClear();
    isBridgeAvailableMock.mockReset();
    getLaunchParamsMock.mockReset();
    isMethodSupportedMock.mockReset();
    isBridgeAvailableMock.mockReturnValue(false);
    getLaunchParamsMock.mockReturnValue(undefined);
    isMethodSupportedMock.mockReturnValue(false);

    const { _resetRegistration } = await import('../src/register');
    _resetRegistration();
  });

  test('registers wallet when bridge is available and method is supported', async () => {
    isBridgeAvailableMock.mockReturnValue(true);
    getLaunchParamsMock.mockReturnValue({ contractVersion: '1.0.0' });
    isMethodSupportedMock.mockReturnValue(true);
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(1);
  });

  test('does not register twice', async () => {
    isBridgeAvailableMock.mockReturnValue(true);
    getLaunchParamsMock.mockReturnValue({ contractVersion: '1.0.0' });
    isMethodSupportedMock.mockReturnValue(true);
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(1);
  });

  test('does not register when bridge is unavailable', async () => {
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(0);
  });

  test('registers when contractVersion is missing', async () => {
    isBridgeAvailableMock.mockReturnValue(true);
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(1);
  });

  test('does not register when wallet method is unsupported', async () => {
    isBridgeAvailableMock.mockReturnValue(true);
    getLaunchParamsMock.mockReturnValue({ contractVersion: '0.2.4' });
    isMethodSupportedMock.mockReturnValue(false);
    const { initAlienWallet } = await import('../src/register');
    initAlienWallet();
    expect(registerWalletMock).toHaveBeenCalledTimes(0);
  });
});
