import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import '../../shared/styles/globals.css'
import './config/i18n'

// Load microphone diagnostics for debugging (exposes window.runMicDiagnostics)
import '@bayit/shared-utils/microphoneDiagnostics'

// Initialize Sentry error tracking before React renders
import { initSentry, SentryErrorBoundary } from './utils/sentry'
import logger from './utils/logger'

const appLogger = logger.scope('App');

const sentryEnabled = initSentry()
if (sentryEnabled) {
  appLogger.info('Sentry error tracking enabled');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SentryErrorBoundary
      fallback={({ error }) => (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 max-w-md text-center">
            <div className="text-5xl mb-4">
              <span role="img" aria-label="warning">
                ⚠️
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-400 mb-6">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SentryErrorBoundary>
  </React.StrictMode>,
)

// Signal that React is ready
setTimeout(() => {
  const splashShown = sessionStorage.getItem('splashShown') === 'true';
  const isHomePage = window.location.pathname === '/' || window.location.pathname === '';

  // Only call hideSplashWhenReady on home page first visit
  if (!splashShown && isHomePage) {
    if (typeof window.hideSplashWhenReady === 'function') {
      window.hideSplashWhenReady();
    }
  } else {
    // Not showing splash, mark as removed
    window.splashScreenRemoved = true;
  }
}, 100)
