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

export class AlienSolanaAccount implements WalletAccount {
  readonly address: string;
  readonly publicKey: Uint8Array;
  readonly chains = SOLANA_CHAINS;
  readonly features = ACCOUNT_FEATURES;
  readonly label?: string;
  readonly icon?: WalletAccount['icon'];

  constructor(publicKeyBase58: string) {
    this.address = publicKeyBase58;
    this.publicKey = base58Decode(publicKeyBase58);
  }
}
