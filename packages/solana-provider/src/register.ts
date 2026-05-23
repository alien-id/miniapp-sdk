import { callability, getLaunchParams } from '@alien-id/miniapps-bridge';
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

  // Single canonical Callability check via the bridge — no manual
  // composition of isBridgeAvailable + isMethodSupported.
  const result = callability('wallet.solana:connect', {
    version: getLaunchParams()?.contractVersion,
  });
  if (!result.callable) {
    if (result.reason === 'host-outdated') {
      console.warn(
        `[@alien-id/miniapps-solana-provider] Wallet is not Callable on Contract Version ${result.has}. Requires ${result.needs}+.`,
      );
    }
    return;
  }

  registered = true;
  const wallet = new AlienSolanaWallet();
  registerWallet(wallet);
}
