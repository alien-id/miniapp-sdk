import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
} from '@alien-id/miniapps-bridge';
import { WALLET_ERROR } from '@alien-id/miniapps-contract';
import { AlienSolanaWallet } from '../src/wallet';
import { BridgeDriver } from './test-utils';

const PUBLIC_KEY = '11111111111111111111111111111111';

const driver = new BridgeDriver();

/**
 * Connect once and return the resulting account. Every wallet test that
 * exercises sign* goes through connect first, so this collapses six lines
 * of boilerplate per test into one.
 */
async function connect(): Promise<{
  wallet: AlienSolanaWallet;
  account: NonNullable<
    Awaited<
      ReturnType<AlienSolanaWallet['features']['standard:connect']['connect']>
    >['accounts'][number]
  >;
}> {
  driver.reply('wallet.solana:connect', 'wallet.solana:connect.response', {
    publicKey: PUBLIC_KEY,
  });
  const wallet = new AlienSolanaWallet();
  const { accounts } = await wallet.features['standard:connect'].connect();
  const account = accounts[0];
  if (!account) throw new Error('Expected connected account');
  return { wallet, account };
}

beforeEach(() => {
  driver.install({ contractVersion: '1.5.0' });
});

afterEach(() => {
  driver.uninstall();
});

describe('AlienSolanaWallet', () => {
  test('normalizes generic request errors from signAndSendTransaction', async () => {
    const { wallet, account } = await connect();
    driver.fail('wallet.solana:sign.send', new Error('boom'));

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
    const { wallet, account } = await connect();
    driver.fail(
      'wallet.solana:sign.send',
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
    const { wallet, account } = await connect();
    driver.fail('wallet.solana:sign.transaction', new BridgeUnavailableError());

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
    const { wallet, account } = await connect();
    driver.fail(
      'wallet.solana:sign.message',
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

  test('disconnect notifies host via the bridge and clears accounts', async () => {
    const { wallet } = await connect();
    driver.accept('wallet.solana:disconnect');

    await wallet.features['standard:disconnect'].disconnect();

    expect(driver.calls).toContainEqual({
      method: 'wallet.solana:disconnect',
      payload: {},
    });
    expect(wallet.accounts).toHaveLength(0);
  });

  test('connect populates accounts and emits a change event', async () => {
    driver.reply('wallet.solana:connect', 'wallet.solana:connect.response', {
      publicKey: PUBLIC_KEY,
    });
    const wallet = new AlienSolanaWallet();

    const changeListener = mock(() => {});
    wallet.features['standard:events'].on('change', changeListener);

    const result = await wallet.features['standard:connect'].connect();

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]?.address).toBe(PUBLIC_KEY);
    expect(changeListener).toHaveBeenCalledTimes(1);
    expect(changeListener).toHaveBeenCalledWith({ accounts: wallet.accounts });
  });

  test('disconnect emits a change event with empty accounts', async () => {
    const { wallet } = await connect();
    driver.accept('wallet.solana:disconnect');

    const changeListener = mock(() => {});
    wallet.features['standard:events'].on('change', changeListener);

    await wallet.features['standard:disconnect'].disconnect();

    expect(changeListener).toHaveBeenCalledTimes(1);
    expect(changeListener).toHaveBeenCalledWith({ accounts: [] });
  });

  test('signTransaction returns base64-decoded bytes from the host', async () => {
    const { wallet, account } = await connect();
    // "AQID" is base64 for [1, 2, 3].
    driver.reply(
      'wallet.solana:sign.transaction',
      'wallet.solana:sign.transaction.response',
      { signedTransaction: 'AQID' },
    );

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
    const { wallet, account } = await connect();
    // Base58 "11" decodes to [0, 0]; we just need any deterministic value.
    driver.reply(
      'wallet.solana:sign.message',
      'wallet.solana:sign.message.response',
      { signature: '11', publicKey: account.address },
    );

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
    const { wallet, account } = await connect();
    // Host signs with a key the caller did not request — must be rejected.
    driver.reply(
      'wallet.solana:sign.message',
      'wallet.solana:sign.message.response',
      { signature: '11', publicKey: '22222222222222222222222222222222' },
    );

    await expect(
      wallet.features['solana:signMessage'].signMessage({
        account,
        message: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: WALLET_ERROR.INTERNAL_ERROR,
    });
  });

  test('features is memoized (reference-stable across accesses)', () => {
    const wallet = new AlienSolanaWallet();
    // Wallet adapters compare feature objects by reference to decide whether
    // capabilities have changed. A fresh object each access would force
    // adapters to re-bind every render.
    expect(wallet.features).toBe(wallet.features);
  });

  test('signAndSendTransaction rejects unknown CAIP chain identifiers', async () => {
    const { wallet, account } = await connect();

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

    expect(
      driver.calls.some((c) => c.method === 'wallet.solana:sign.send'),
    ).toBe(false);
  });

  test('signAndSendTransaction returns base58-decoded signature on success', async () => {
    const { wallet, account } = await connect();
    driver.reply(
      'wallet.solana:sign.send',
      'wallet.solana:sign.send.response',
      { signature: '11' },
    );

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
    const { wallet, account } = await connect();
    // "!!!" is not valid base64. Without safeDecode, atob throws raw
    // DOMException which leaks past .catch(normalizeWalletError).
    driver.reply(
      'wallet.solana:sign.transaction',
      'wallet.solana:sign.transaction.response',
      { signedTransaction: '!!!' },
    );

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
    const { wallet, account } = await connect();
    // "0" is not in the base58 alphabet; bs58.decode throws.
    driver.reply(
      'wallet.solana:sign.send',
      'wallet.solana:sign.send.response',
      { signature: '0not-base58!' },
    );

    await expect(
      wallet.features['solana:signAndSendTransaction'].signAndSendTransaction({
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
    const { wallet, account } = await connect();
    driver.reply(
      'wallet.solana:sign.message',
      'wallet.solana:sign.message.response',
      { signature: '0not-base58!', publicKey: account.address },
    );

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
