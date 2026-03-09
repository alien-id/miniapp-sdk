import { createMockBridge } from '@alien_org/bridge/mock';
import { AlienProvider } from '@alien_org/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// In dev mode (outside the Alien App), create a mock bridge so the
// SDK works without the native host.  The mock auto-responds to
// methods like payment:request and clipboard:read.
if (import.meta.env.DEV && !window.__miniAppsBridge__) {
  createMockBridge();
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AlienProvider>
      <App />
    </AlienProvider>
  </StrictMode>,
);
