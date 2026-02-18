import { AlienProvider } from '@alien_org/react';
import { initAlienWallet } from '@alien_org/solana-provider';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Register Alien wallet via wallet-standard before AppKit init.
// AppKit auto-discovers wallet-standard wallets.
initAlienWallet();

// Initialize Reown AppKit (must be imported after wallet registration).
import './appkit';

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AlienProvider>
      <App />
    </AlienProvider>
  </StrictMode>,
);
