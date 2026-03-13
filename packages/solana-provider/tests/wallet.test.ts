import { beforeEach, describe, expect, mock, test } from 'bun:test';

class MockBridgeTimeoutError extends Error {}

const requestMock = mock(async (_method: string) => {
  switch (_method) {
    case 'wallet.solana:connect':
      return {
        result: { publicKey: '11111111111111111111111111111111' },
        reqId: 'req-connect',
      };
    case 'wallet.solana:sign.transaction':
      return {
        result: { transaction: 'mock-signed-tx' },
        reqId: 'req-sign-tx',
      };
    case 'wallet.solana:sign.message':
      return {
        result: {
          signature: 'mock-sig',
          publicKey: '11111111111111111111111111111111',
        },
        reqId: 'req-sign-msg',
      };
    case 'wallet.solana:sign.send':
      return {
        result: { signature: '11111111111111111111111111111111' },
        reqId: 'req-send',
      };
    default:
      return { reqId: 'req-default' };
  }
});

const sendIfAvailableMock = mock(() => ({ ok: true, data: undefined }));
const sendMock = Object.assign(
  mock(() => {}),
  {
    ifAvailable: sendIfAvailableMock,
  },
);

mock.module('@alien-id/miniapps-bridge', () => ({
  request: requestMock,
  send: sendMock,
  BridgeTimeoutError: MockBridgeTimeoutError,
}));

mock.module('@alien-id/miniapps-contract', () => ({
  WALLET_ERROR: {
    USER_REJECTED: 4001,
    TRANSACTION_REJECTED: -32003,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    REQUEST_EXPIRED: 8000,
    METHOD_NOT_FOUND: -32601,
  },
}));

describe('AlienSolanaWallet', () => {
  beforeEach(() => {
    requestMock.mockReset();
    sendMock.mockClear();
    sendIfAvailableMock.mockClear();

    requestMock.mockImplementation(async (method: string) => {
      switch (method) {
        case 'wallet.solana:connect':
          return {
            result: { publicKey: '11111111111111111111111111111111' },
            reqId: 'req-connect',
          };
        case 'wallet.solana:sign.send':
          return {
            result: { signature: '11111111111111111111111111111111' },
            reqId: 'req-send',
          };
        default:
          return { reqId: 'req-default' };
      }
    });
  });

  test('normalizes bridge timeout errors from connect', async () => {
    const { WALLET_ERROR } = await import('@alien-id/miniapps-contract');
    const { AlienSolanaWallet } = await import('../src/wallet');

    requestMock.mockRejectedValueOnce(
      new MockBridgeTimeoutError('Request timed out'),
    );

    const wallet = new AlienSolanaWallet();

    await expect(
      wallet.features['standard:connect'].connect(),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.REQUEST_EXPIRED,
      message: 'Request timed out',
    });
  });

  test('normalizes generic request errors from signAndSendTransaction', async () => {
    const { WALLET_ERROR } = await import('@alien-id/miniapps-contract');
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) {
      throw new Error('Expected connected account');
    }

    requestMock.mockRejectedValueOnce(new Error('boom'));

    await expect(
      wallet.features['solana:signAndSendTransaction'].signAndSendTransaction({
        account,
        chain: 'solana:mainnet',
        transaction: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.INTERNAL_ERROR,
      message: 'boom',
    });
  });

  test('throws AlienWalletError when response contains error envelope', async () => {
    const { WALLET_ERROR } = await import('@alien_org/contract');
    const { AlienSolanaWallet, AlienWalletError } = await import(
      '../src/wallet'
    );

    const wallet = new AlienSolanaWallet();

    requestMock.mockImplementation(async () => ({
      error: { code: 4001, message: 'User rejected' },
      reqId: 'req-err',
    }));

    await expect(
      wallet.features['standard:connect'].connect(),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.USER_REJECTED,
      message: 'User rejected',
    });

    try {
      await wallet.features['standard:connect'].connect();
    } catch (err) {
      expect(err).toBeInstanceOf(AlienWalletError);
    }
  });

  test('throws AlienWalletError with data from error envelope', async () => {
    const { AlienWalletError, AlienSolanaWallet } = await import(
      '../src/wallet'
    );

    const wallet = new AlienSolanaWallet();

    requestMock.mockImplementation(async () => ({
      error: {
        code: -32003,
        message: 'Simulation failed',
        data: { logs: ['Program failed'] },
      },
      reqId: 'req-err-data',
    }));

    try {
      await wallet.features['standard:connect'].connect();
    } catch (err) {
      expect(err).toBeInstanceOf(AlienWalletError);
      expect((err as InstanceType<typeof AlienWalletError>).code).toBe(-32003);
      expect((err as InstanceType<typeof AlienWalletError>).data).toEqual({
        logs: ['Program failed'],
      });
    }
  });

  test('signAndSendTransaction throws on error envelope from bridge', async () => {
    const { WALLET_ERROR } = await import('@alien_org/contract');
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    requestMock.mockImplementationOnce(async () => ({
      error: { code: 4001, message: 'User rejected' },
      reqId: 'req-sign-err',
    }));

    await expect(
      wallet.features['solana:signAndSendTransaction'].signAndSendTransaction({
        account,
        chain: 'solana:mainnet',
        transaction: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.USER_REJECTED,
      message: 'User rejected',
    });
  });

  test('preserves method-not-found errors from the host', async () => {
    const { WALLET_ERROR } = await import('@alien_org/contract');
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();

    requestMock.mockImplementationOnce(async () => ({
      error: { code: -32601, message: 'Method not found' },
      reqId: 'req-missing-method',
    }));

    await expect(
      wallet.features['standard:connect'].connect(),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.METHOD_NOT_FOUND,
      message: 'Method not found',
    });
  });

  test('signTransaction returns signed transaction bytes', async () => {
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    requestMock.mockImplementationOnce(async () => ({
      result: { transaction: btoa(String.fromCharCode(9, 8, 7)) },
      reqId: 'req-sign-tx',
    }));

    const [output] = await wallet.features[
      'solana:signTransaction'
    ].signTransaction({
      account,
      chain: 'solana:mainnet',
      transaction: new Uint8Array([1, 2, 3]),
    });

    expect(output?.signedTransaction).toBeInstanceOf(Uint8Array);
    expect(output?.signedTransaction).toEqual(new Uint8Array([9, 8, 7]));
  });

  test('signMessage returns signature bytes', async () => {
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    // base58 for a 3-byte signature (mock)
    requestMock.mockImplementationOnce(async () => ({
      result: {
        signature: '2qPNr',
        publicKey: '11111111111111111111111111111111',
      },
      reqId: 'req-sign-msg',
    }));

    const [output] = await wallet.features['solana:signMessage'].signMessage({
      account,
      message: new Uint8Array([72, 101, 108, 108, 111]),
    });

    expect(output?.signedMessage).toEqual(
      new Uint8Array([72, 101, 108, 108, 111]),
    );
    expect(output?.signature).toBeInstanceOf(Uint8Array);
    expect(output?.signatureType).toBe('ed25519');
  });

  test('disconnect uses send.ifAvailable and clears accounts', async () => {
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    await wallet.features['standard:connect'].connect();

    await wallet.features['standard:disconnect'].disconnect();

    expect(sendIfAvailableMock).toHaveBeenCalledTimes(1);
    expect(sendIfAvailableMock).toHaveBeenCalledWith(
      'wallet.solana:disconnect',
      {},
    );
    expect(wallet.accounts).toHaveLength(0);
  });
});
