import { Buffer } from 'buffer';
(window as Window & { Buffer?: typeof Buffer }).Buffer = Buffer;

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import WalletContextProvider from './providers/WalletContextProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletContextProvider>
      <App />
    </WalletContextProvider>
  </StrictMode>,
)
