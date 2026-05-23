import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
  WALLET_ERROR_MOCK,
} from './test-utils';

// Widen the mocked request response type so individual tests can pass
// arbitrary payload shapes via `mockResolvedValueOnce(...)`. The bridge
// `request()` is generic over method/event, so this stand-in just needs
// to mimic the catch-all object shape used in production.
const requestMock = mock(
  async (method: string): Promise<Record<string, unknown>> => {
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
  },
);

const sendMock = Object.assign(
  mock(() => {}),
  {
    ifAvailable: mock(() => ({ ok: true, data: undefined })),
  },
);

mock.module('@alien-id/miniapps-bridge', () => ({
  BridgeMethodUnsupportedError,
  BridgeUnavailableError,
  BridgeTimeoutError,
  request: requestMock,
  send: sendMock,
}));

mock.module('@alien-id/miniapps-contract', () => ({
  WALLET_ERROR: WALLET_ERROR_MOCK,
}));

describe('AlienSolanaWallet', () => {
  beforeEach(() => {
    requestMock.mockReset();
    sendMock.mockClear();
    sendMock.ifAvailable.mockClear();

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

  test('maps BridgeMethodUnsupportedError to actionable wallet error', async () => {
    const { WALLET_ERROR } = await import('@alien-id/miniapps-contract');
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    requestMock.mockRejectedValueOnce(
      new BridgeMethodUnsupportedError(
        'wallet.solana:sign.send',
        '0.2.4',
        '1.0.0',
      ),
    );

    await expect(
      wallet.features['solana:signAndSendTransaction'].signAndSendTransaction({
        account,
        chain: 'solana:mainnet',
        transaction: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.INTERNAL_ERROR,
      message:
        'Alien App needs to be updated to v1.0.0 to use this wallet feature (host is v0.2.4).',
    });
  });

  test('maps BridgeUnavailableError to actionable wallet error', async () => {
    const { WALLET_ERROR } = await import('@alien-id/miniapps-contract');
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    // Mock connect to succeed once so we have an account to sign with.
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    requestMock.mockRejectedValueOnce(new BridgeUnavailableError());

    await expect(
      wallet.features['solana:signTransaction'].signTransaction({
        account,
        chain: 'solana:mainnet',
        transaction: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.INTERNAL_ERROR,
      message:
        'Alien App bridge is not available. Open this miniapp inside Alien App.',
    });
  });

  test('maps BridgeTimeoutError to REQUEST_EXPIRED wallet error', async () => {
    const { WALLET_ERROR } = await import('@alien-id/miniapps-contract');
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    requestMock.mockRejectedValueOnce(
      new BridgeTimeoutError('wallet.solana:sign.message', 30000),
    );

    await expect(
      wallet.features['solana:signMessage'].signMessage({
        account,
        message: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.REQUEST_EXPIRED,
      message:
        'Alien App did not respond to wallet.solana:sign.message within 30000ms.',
    });
  });

  test('disconnect uses send.ifAvailable and clears accounts', async () => {
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    await wallet.features['standard:connect'].connect();

    await wallet.features['standard:disconnect'].disconnect();

    expect(sendMock.ifAvailable).toHaveBeenCalledTimes(1);
    expect(sendMock.ifAvailable).toHaveBeenCalledWith(
      'wallet.solana:disconnect',
      {},
    );
    expect(wallet.accounts).toHaveLength(0);
  });

  test('connect populates accounts and emits a change event', async () => {
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();

    const changeListener = mock(() => {});
    wallet.features['standard:events'].on('change', changeListener);

    const result = await wallet.features['standard:connect'].connect();

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]?.address).toBe(
      '11111111111111111111111111111111',
    );
    expect(changeListener).toHaveBeenCalledTimes(1);
    expect(changeListener).toHaveBeenCalledWith({
      accounts: wallet.accounts,
    });
  });

  test('disconnect emits a change event with empty accounts', async () => {
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    await wallet.features['standard:connect'].connect();

    const changeListener = mock(() => {});
    wallet.features['standard:events'].on('change', changeListener);

    await wallet.features['standard:disconnect'].disconnect();

    expect(changeListener).toHaveBeenCalledTimes(1);
    expect(changeListener).toHaveBeenCalledWith({ accounts: [] });
  });

  test('signTransaction returns base64-decoded bytes from the host', async () => {
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    // "AQID" is base64 for [1, 2, 3].
    requestMock.mockResolvedValueOnce({
      signedTransaction: 'AQID',
      reqId: 'req-sign-tx',
    });

    const [output] = await wallet.features[
      'solana:signTransaction'
    ].signTransaction({
      account,
      chain: 'solana:mainnet',
      transaction: new Uint8Array([9, 9, 9]),
    });

    expect(output?.signedTransaction).toEqual(new Uint8Array([1, 2, 3]));
  });

  test('signMessage round-trip returns base58-decoded signature', async () => {
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    // Base58 "11" decodes to [0, 0]; we just need any deterministic value.
    requestMock.mockResolvedValueOnce({
      signature: '11',
      publicKey: account.address,
      reqId: 'req-sign-msg',
    });

    const message = new Uint8Array([1, 2, 3]);
    const [output] = await wallet.features['solana:signMessage'].signMessage({
      account,
      message,
    });

    expect(output?.signedMessage).toBe(message);
    expect(output?.signatureType).toBe('ed25519');
    expect(output?.signature).toBeInstanceOf(Uint8Array);
  });

  test('signMessage rejects when host returns a different publicKey than the requested account', async () => {
    const { WALLET_ERROR } = await import('@alien-id/miniapps-contract');
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    // Host signs with a key the caller did not request — must be rejected.
    requestMock.mockResolvedValueOnce({
      signature: '11',
      publicKey: '22222222222222222222222222222222',
      reqId: 'req-sign-msg-mismatch',
    });

    await expect(
      wallet.features['solana:signMessage'].signMessage({
        account,
        message: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.INTERNAL_ERROR,
    });
  });

  test('features is memoized (reference-stable across accesses)', async () => {
    const { AlienSolanaWallet } = await import('../src/wallet');
    const wallet = new AlienSolanaWallet();
    // Wallet adapters compare feature objects by reference to decide whether
    // capabilities have changed. A fresh object each access would force
    // adapters to re-bind every render.
    expect(wallet.features).toBe(wallet.features);
  });

  test('signAndSendTransaction rejects unknown CAIP chain identifiers', async () => {
    const { WALLET_ERROR } = await import('@alien-id/miniapps-contract');
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    await expect(
      wallet.features['solana:signAndSendTransaction'].signAndSendTransaction({
        account,
        // Cast through unknown because TS would otherwise reject the chain
        // value; the wallet must still defend against runtime callers that
        // do not honour the type.
        chain: 'evm:1' as unknown as 'solana:mainnet',
        transaction: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.INVALID_PARAMS,
    });

    expect(requestMock).not.toHaveBeenCalledWith(
      'wallet.solana:sign.send',
      expect.anything(),
      expect.anything(),
    );
  });

  test('signAndSendTransaction returns base58-decoded signature on success', async () => {
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    requestMock.mockResolvedValueOnce({
      signature: '11',
      reqId: 'req-sign-send-ok',
    });

    const [output] = await wallet.features[
      'solana:signAndSendTransaction'
    ].signAndSendTransaction({
      account,
      chain: 'solana:devnet',
      transaction: new Uint8Array([1, 2, 3]),
    });

    expect(output?.signature).toBeInstanceOf(Uint8Array);
  });

  test('signTransaction wraps malformed host base64 as AlienWalletError', async () => {
    const { WALLET_ERROR } = await import('@alien-id/miniapps-contract');
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    // "!" is not valid base64. Without safeDecode, atob throws raw DOMException
    // which leaks past .catch(normalizeWalletError) into the adapter.
    requestMock.mockResolvedValueOnce({
      signedTransaction: '!!!',
      reqId: 'req-bad-b64',
    });

    await expect(
      wallet.features['solana:signTransaction'].signTransaction({
        account,
        chain: 'solana:mainnet',
        transaction: new Uint8Array([1]),
      }),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.INTERNAL_ERROR,
      message: expect.stringContaining('signedTransaction'),
    });
  });

  test('signAndSendTransaction wraps malformed host base58 as AlienWalletError', async () => {
    const { WALLET_ERROR } = await import('@alien-id/miniapps-contract');
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    // "0" is not in the base58 alphabet; bs58.decode throws.
    requestMock.mockResolvedValueOnce({
      signature: '0not-base58!',
      reqId: 'req-bad-b58',
    });

    await expect(
      wallet.features[
        'solana:signAndSendTransaction'
      ].signAndSendTransaction({
        account,
        chain: 'solana:devnet',
        transaction: new Uint8Array([1]),
      }),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.INTERNAL_ERROR,
      message: expect.stringContaining('signature'),
    });
  });

  test('signMessage wraps malformed host base58 as AlienWalletError', async () => {
    const { WALLET_ERROR } = await import('@alien-id/miniapps-contract');
    const { AlienSolanaWallet } = await import('../src/wallet');

    const wallet = new AlienSolanaWallet();
    const connectResult = await wallet.features['standard:connect'].connect();
    const account = connectResult.accounts[0];
    if (!account) throw new Error('Expected connected account');

    requestMock.mockResolvedValueOnce({
      signature: '0not-base58!',
      publicKey: account.address,
      reqId: 'req-bad-b58-msg',
    });

    await expect(
      wallet.features['solana:signMessage'].signMessage({
        account,
        message: new Uint8Array([1]),
      }),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.INTERNAL_ERROR,
      message: expect.stringContaining('signature'),
    });
  });
});
