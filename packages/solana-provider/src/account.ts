import type { IdentifierString, WalletAccount } from '@wallet-standard/base';
import { base58Decode } from './utils';

const SOLANA_CHAINS = [
  'solana:mainnet',
  'solana:devnet',
  'solana:testnet',
] as const;

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

  constructor(publicKeyBase58: string) {
    // Decode and validate length BEFORE setting `address` so a partially
    // initialised account is never observable to callers.
    const publicKey = base58Decode(publicKeyBase58);
    if (publicKey.length !== SOLANA_PUBKEY_BYTE_LENGTH) {
      throw new Error(
        `Invalid Solana public key length: expected ${SOLANA_PUBKEY_BYTE_LENGTH} bytes, got ${publicKey.length}.`,
      );
    }
    this.publicKey = publicKey;
    this.address = publicKeyBase58;
  }
}
