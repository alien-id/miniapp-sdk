import { describe, expect, test } from 'bun:test';
import { AlienSolanaAccount } from '../src/account';
import { base58Encode } from '../src/utils';

describe('AlienSolanaAccount', () => {
  test('accepts a 32-byte (Solana-pubkey-sized) base58 string', () => {
    const account = new AlienSolanaAccount(
      '11111111111111111111111111111111',
    );
    expect(account.publicKey.length).toBe(32);
    expect(account.address).toBe('11111111111111111111111111111111');
  });

  test('rejects a base58 string that decodes to fewer than 32 bytes', () => {
    // "1A" decodes to 2 bytes — not a valid Solana pubkey.
    expect(() => new AlienSolanaAccount('1A')).toThrow();
  });

  test('rejects a base58 string that decodes to more than 32 bytes', () => {
    // 64 random bytes — Ed25519 signature-sized, not pubkey-sized.
    const tooLong = new Uint8Array(64);
    crypto.getRandomValues(tooLong);
    const encoded = base58Encode(tooLong);
    expect(() => new AlienSolanaAccount(encoded)).toThrow();
  });

  test('exposes wallet-standard required fields', () => {
    const account = new AlienSolanaAccount(
      '11111111111111111111111111111111',
    );
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
