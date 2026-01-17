import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import '../../shared/styles/globals.css'
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
// Only trigger on home page and first session load
setTimeout(() => {
  const splashShown = sessionStorage.getItem('splashShown') === 'true';
  const isHomePage = window.location.pathname === '/' || window.location.pathname === '';
  
  if (typeof window.hideSplashWhenReady === 'function' && !splashShown && isHomePage) {
    window.hideSplashWhenReady()
  } else {
    // Mark as removed if splash wasn't shown
    window.splashScreenRemoved = true;
  }
}, 100)
