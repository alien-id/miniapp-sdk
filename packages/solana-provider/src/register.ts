import { getLaunchParams, isBridgeAvailable } from '@alien-id/miniapps-bridge';
import { isMethodSupported } from '@alien-id/miniapps-contract';
import { registerWallet } from '@wallet-standard/wallet';
import { AlienSolanaWallet } from './wallet';

let registered = false;

/** @internal Reset registration state for testing only. */
export function _resetRegistration(): void {
  registered = false;
}

// TODO: Remove bridge check when relay transport is implemented.
// Relay will allow the wallet to work outside the Alien App (QR/WebSocket).
export function initAlienWallet(): void {
  if (registered) return;
  if (!isBridgeAvailable()) return;

  const contractVersion = getLaunchParams()?.contractVersion;
  if (
    contractVersion &&
    !isMethodSupported('wallet.solana:connect', contractVersion)
  ) {
    console.warn(
      `[@alien-id/miniapps-solana-provider] Wallet is not supported by contract version ${contractVersion}. Requires 1.0.0+.`,
    );
    return;
  }

  registered = true;
  const wallet = new AlienSolanaWallet();
  registerWallet(wallet);
}
