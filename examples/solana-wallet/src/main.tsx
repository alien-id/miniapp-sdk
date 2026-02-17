import { AlienProvider } from '@alien_org/react';
import { initAlienWallet } from '@alien_org/solana-provider';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
