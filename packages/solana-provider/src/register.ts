import { isBridgeAvailable } from '@alien_org/bridge';
import { registerWallet } from '@wallet-standard/wallet';
import { AlienSolanaWallet } from './wallet';

let registered = false;

// TODO: Remove bridge check when relay transport is implemented.
// Relay will allow the wallet to work outside the Alien App (QR/WebSocket).
export function initAlienWallet(): void {
  if (registered) return;
  if (!isBridgeAvailable()) return;
  registered = true;
  const wallet = new AlienSolanaWallet();
  registerWallet(wallet);
}
