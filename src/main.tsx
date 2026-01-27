import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './components/contexts/AuthContext.tsx'
import { ToastProvider } from './components/contexts/ToastContext.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)