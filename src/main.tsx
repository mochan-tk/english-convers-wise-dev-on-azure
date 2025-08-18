import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import liff from '@line/liff'

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// Initialize LIFF on app startup (non-blocking)
async function initializeLiff() {
  try {
    const liffId = import.meta.env.VITE_LIFF_ID
    if (!liffId) {
      console.warn('VITE_LIFF_ID is not set')
      return
    }

    await liff.init({ liffId })
    console.log('LIFF initialized successfully')
  } catch (error) {
    console.error('LIFF initialization failed:', error)
  }
}

// Fire and forget; don’t block rendering
initializeLiff()

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
