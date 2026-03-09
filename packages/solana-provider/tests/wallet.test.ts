import { beforeEach, describe, expect, mock, test } from 'bun:test';

class MockBridgeTimeoutError extends Error {}

const requestMock = mock(async (method: string) => {
  if (method === 'wallet.solana:connect') {
    return {
      publicKey: '11111111111111111111111111111111',
      reqId: 'req-connect',
    };
  }

  if (method === 'wallet.solana:sign.send') {
    return { signature: '11111111111111111111111111111111', reqId: 'req-send' };
  }

  return { reqId: 'req-default' };
});

const sendIfAvailableMock = mock(() => ({ ok: true, data: undefined }));
const sendMock = Object.assign(
  mock(() => {}),
  {
    ifAvailable: sendIfAvailableMock,
  },
);

mock.module('@alien_org/bridge', () => ({
  request: requestMock,
  send: sendMock,
  BridgeTimeoutError: MockBridgeTimeoutError,
}));

mock.module('@alien_org/contract', () => ({
  WALLET_ERROR: {
    USER_REJECTED: 5000,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    REQUEST_EXPIRED: 8000,
  },
}));

describe('AlienSolanaWallet', () => {
  beforeEach(() => {
    requestMock.mockReset();
    sendMock.mockClear();
    sendIfAvailableMock.mockClear();

    requestMock.mockImplementation(async (method: string) => {
      if (method === 'wallet.solana:connect') {
        return {
          publicKey: '11111111111111111111111111111111',
          reqId: 'req-connect',
        };
      }

      if (method === 'wallet.solana:sign.send') {
        return {
          signature: '11111111111111111111111111111111',
          reqId: 'req-send',
        };
      }

      return { reqId: 'req-default' };
    });
  });

  test('normalizes bridge timeout errors from connect', async () => {
    const { WALLET_ERROR } = await import('@alien_org/contract');
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
    const { WALLET_ERROR } = await import('@alien_org/contract');
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
