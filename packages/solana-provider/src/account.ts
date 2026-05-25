import { SOLANA_CHAINS, WALLET_ERROR } from '@alien-id/miniapps-contract';
import type { IdentifierString, WalletAccount } from '@wallet-standard/base';
import { AlienWalletError } from './errors';

const ACCOUNT_FEATURES: readonly IdentifierString[] = [
  'solana:signTransaction',
  'solana:signAndSendTransaction',
  'solana:signMessage',
];

/** Solana ed25519 public keys are always exactly 32 bytes. Anything else is
 * either malformed or a different key type (e.g. a signature). Reject early
 * so signing flows never operate on an "account" whose pubkey can't even
 * round-trip through the Solana runtime. */
const SOLANA_PUBKEY_BYTE_LENGTH = 32;

export class AlienSolanaAccount implements WalletAccount {
  readonly address: string;
  readonly publicKey: Uint8Array;
  readonly chains = SOLANA_CHAINS;
  readonly features = ACCOUNT_FEATURES;
  readonly label?: string;
  readonly icon?: WalletAccount['icon'];

  /**
   * Caller is responsible for decoding `address` (base58) into `publicKey`
   * before construction so codec failures surface as typed wallet errors
   * at the bridge boundary instead of generic decode exceptions thrown
   * from inside a half-built account.
   */
  constructor(publicKey: Uint8Array, address: string) {
    // Validate length BEFORE assigning fields so a partially initialised
    // account is never observable to callers.
    if (publicKey.length !== SOLANA_PUBKEY_BYTE_LENGTH) {
      throw new AlienWalletError(
        WALLET_ERROR.INTERNAL_ERROR,
        `Invalid Solana public key length: expected ${SOLANA_PUBKEY_BYTE_LENGTH} bytes, got ${publicKey.length}.`,
      );
    }
    this.publicKey = publicKey;
    this.address = address;
  }
}
