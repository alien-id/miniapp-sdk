import { isBridgeAvailable } from '@alien-id/miniapps-bridge';
import { createMockBridge } from '@alien-id/miniapps-bridge/mock';
import { AlienProvider } from '@alien-id/miniapps-react';
import { initAlienWallet } from '@alien-id/miniapps-solana-provider';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// In dev mode, create a mock bridge so the SDK and wallet provider
// work without the native host.
if (import.meta.env.DEV && !isBridgeAvailable()) {
  createMockBridge();
}

// Register Alien wallet via wallet-standard before rendering.
// The Solana wallet adapter will auto-discover it.
initAlienWallet();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AlienProvider>
      <App />
    </AlienProvider>
  </StrictMode>,
);
