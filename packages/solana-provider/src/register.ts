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
  // SSR-safe: server-rendered miniapps that import the provider in their
  // entry would otherwise crash before the host bridge can ever exist.
  // `window` is the only env-specific global we need to gate on; the bridge
  // helpers below ultimately reach for it.
  if (typeof window === 'undefined') {
    console.debug(
      '[@alien-id/miniapps-solana-provider] No window global (SSR). Skipping registration.',
    );
    return;
  }

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
    } else {
      // Symmetric with the host-outdated warn: bridge is simply not there
      // (e.g. opened outside Alien App). Quiet in browsers, surfaceable
      // via DevTools verbose logging.
      console.debug(
        '[@alien-id/miniapps-solana-provider] Bridge is not available. Skipping registration.',
      );
    }
    return;
  }

  registered = true;
  const wallet = new AlienSolanaWallet();
  registerWallet(wallet);
}
