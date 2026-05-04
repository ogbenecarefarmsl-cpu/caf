import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/query-client'

// Global error handler for uncaught promises (like MetaMask connection errors)
window.addEventListener('unhandledrejection', (event) => {
  // Suppress MetaMask connection errors as they are not critical to the app
  if (event.reason?.message?.includes('MetaMask') || 
      event.reason?.message?.includes('ethereum') ||
      event.reason?.message?.includes('extension not found')) {
    console.warn('MetaMask error suppressed:', event.reason.message);
    event.preventDefault();
    return;
  }
  
  // Log other unhandled promise rejections
  console.error('Unhandled promise rejection:', event.reason);
});

const bootstrap = async () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
