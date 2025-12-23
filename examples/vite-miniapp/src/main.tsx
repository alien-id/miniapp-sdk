import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AlienProvider } from '@alien-id/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlienProvider>
      <App />
    </AlienProvider>
  </StrictMode>,
)
