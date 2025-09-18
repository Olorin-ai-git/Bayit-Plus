import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Error boundary for the shell application
class ShellErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Shell application error:', error, errorInfo);

    // Send error to monitoring service
    if (window.olorin?.monitoring) {
      window.olorin.monitoring.captureException(error, {
        context: 'shell',
        errorInfo
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Application Error
            </h1>
            <p className="text-gray-600 text-center mb-4">
              Something went wrong with the Olorin application. Please refresh the page or contact support if the problem persists.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap text-red-600">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize global Olorin namespace
declare global {
  interface Window {
    olorin: {
      version: string;
      environment: string;
      services: Record<string, any>;
      eventBus: any;
      monitoring: any;
      config: Record<string, any>;
    };
  }
}

window.olorin = {
  version: process.env.REACT_APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  services: {},
  eventBus: null,
  monitoring: null,
  config: {
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090',
    wsUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:8090',
    enableDebug: process.env.NODE_ENV === 'development'
  }
};

// Service registration helper
window.olorin.registerService = (name: string, service: any) => {
  window.olorin.services[name] = service;
  console.log(`[Olorin Shell] Registered service: ${name}`);
};

// Get service helper
window.olorin.getService = (name: string) => {
  return window.olorin.services[name];
};

// Initialize the application
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ShellErrorBoundary>
      <App />
    </ShellErrorBoundary>
  </React.StrictMode>
);

// Service worker registration for PWA capabilities
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[Olorin Shell] SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('[Olorin Shell] SW registration failed: ', registrationError);
      });
  });
}

// Performance monitoring
if (window.olorin.config.enableDebug) {
  // Web Vitals reporting
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}

// Hot module replacement for development
if (module.hot && process.env.NODE_ENV === 'development') {
  module.hot.accept('./App', () => {
    const NextApp = require('./App').default;
    root.render(
      <React.StrictMode>
        <ShellErrorBoundary>
          <NextApp />
        </ShellErrorBoundary>
      </React.StrictMode>
    );
  });
}