import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AuthGate from './modules/auth/AuthGate'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>
)
