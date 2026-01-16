import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import '../../shared/styles/globals.css'
import './styles/animations.css'
import '@bayit/shared-i18n'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// Signal that React is ready and can hide splash screen
// The splash screen will respect minimum display time (3 seconds)
setTimeout(() => {
  if (typeof window.hideSplashWhenReady === 'function') {
    window.hideSplashWhenReady()
  }
}, 100)
