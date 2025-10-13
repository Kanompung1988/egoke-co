import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './components/contexts/AuthContext.tsx' // <-- 1. Import เข้ามา

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider> {/* <-- 2. นำไปครอบ App */}
      <App />
    </AuthProvider>
  </React.StrictMode>,
)