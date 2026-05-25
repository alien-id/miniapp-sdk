import { describe, expect, test } from 'bun:test';
import { WALLET_ERROR } from '@alien-id/miniapps-contract';
import { AlienSolanaAccount } from '../src/account';
import { AlienWalletError } from '../src/errors';
import { base58Decode } from '../src/utils';

const SYSTEM_PROGRAM = '11111111111111111111111111111111';

describe('AlienSolanaAccount', () => {
  test('accepts a decoded 32-byte pubkey paired with its base58 address', () => {
    const publicKey = base58Decode(SYSTEM_PROGRAM);
    const account = new AlienSolanaAccount(publicKey, SYSTEM_PROGRAM);
    expect(account.publicKey.length).toBe(32);
    expect(account.address).toBe(SYSTEM_PROGRAM);
  });

  test('rejects a pubkey shorter than 32 bytes with a typed wallet error', () => {
    // 2 bytes — not a valid Solana pubkey.
    expect(() => new AlienSolanaAccount(new Uint8Array(2), 'short')).toThrow(
      AlienWalletError,
    );
    try {
      new AlienSolanaAccount(new Uint8Array(2), 'short');
    } catch (err) {
      expect(err).toBeInstanceOf(AlienWalletError);
      expect((err as AlienWalletError).code).toBe(WALLET_ERROR.INTERNAL_ERROR);
    }
  });

  test('rejects a pubkey longer than 32 bytes with a typed wallet error', () => {
    // 64 bytes — Ed25519 signature-sized, not pubkey-sized.
    const tooLong = new Uint8Array(64);
    crypto.getRandomValues(tooLong);
    expect(() => new AlienSolanaAccount(tooLong, 'long')).toThrow(
      AlienWalletError,
    );
  });

  test('exposes wallet-standard required fields', () => {
    const publicKey = base58Decode(SYSTEM_PROGRAM);
    const account = new AlienSolanaAccount(publicKey, SYSTEM_PROGRAM);
    expect(account.chains).toEqual([
      'solana:mainnet',
      'solana:devnet',
      'solana:testnet',
    ]);
    expect(account.features).toEqual([
      'solana:signTransaction',
      'solana:signAndSendTransaction',
      'solana:signMessage',
    ]);
  });
});
