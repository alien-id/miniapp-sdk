import type { WalletSolanaErrorCode } from '@alien-id/miniapps-contract';

/**
 * Typed wallet error surfaced to wallet-standard adapters. Carries a
 * `WalletSolanaErrorCode` so adapters can branch on the error class
 * without parsing the message. Lives in its own file so `account.ts` can
 * throw it without forming an import cycle with `wallet.ts`.
 */
export class AlienWalletError extends Error {
  readonly code: WalletSolanaErrorCode;

  constructor(code: WalletSolanaErrorCode, message?: string) {
    super(message ?? `Wallet error: ${code}`);
    this.name = 'AlienWalletError';
    this.code = code;
  }
}
