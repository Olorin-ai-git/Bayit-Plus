import React from 'react';
import ReactDOM from 'react-dom/client';
import { initializeRuntimeConfig } from '@shared/config/runtimeConfig';
import App from './App';
import './index.css';

// Global error handler for browser extension errors
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || String(event.reason || '');
  const isBrowserExtensionError = 
    errorMessage.includes('message channel closed') ||
    errorMessage.includes('asynchronous response') ||
    errorMessage.includes('Extension context invalidated') ||
    errorMessage.includes('A listener indicated an asynchronous response');
  
  if (isBrowserExtensionError) {
    // Suppress browser extension errors - they're harmless
    event.preventDefault();
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Shell] Suppressed browser extension error (harmless):', errorMessage);
    }
    return;
  }
  
  // Let other errors propagate normally
});

// Initialize runtime configuration from environment variables
initializeRuntimeConfig();

// Hot Module Replacement type declaration
declare const module: {
  hot?: {
    accept: (path: string, callback: () => void) => void;
  };
};

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

    // Log error (monitoring service would be implemented separately)
    console.error('Error context:', { context: 'shell', errorInfo });
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

// Note: Global Olorin namespace is initialized in globals.ts
// This file just uses the existing window.olorin object

// Global reference to prevent creating multiple roots
declare global {
  interface Window {
    __olorin_root__?: ReactDOM.Root;
  }
}

// Restore root reference from HMR BEFORE any initialization (must be at module level)
if (typeof module !== 'undefined' && module.hot && module.hot.data && module.hot.data.root) {
  window.__olorin_root__ = module.hot.data.root;
  // Root restored from HMR
}

// Guard to prevent multiple initializations
// Use a more robust check that persists across module reloads
let isInitialized = false;

// Initialize the application (prevent multiple root creations)
const initializeShellApp = () => {
  // Check if we already have a root in our global (from HMR or previous init)
  if (window.__olorin_root__) {
    // React root already exists, re-rendering
    // Just re-render with the existing root
    try {
      window.__olorin_root__.render(
        <React.StrictMode>
          <ShellErrorBoundary>
            <App />
          </ShellErrorBoundary>
        </React.StrictMode>
      );
      return;
    } catch (error) {
      // Root might be invalid, clear it and create a new one
      // Silently handle - this is expected during HMR
      window.__olorin_root__ = undefined;
    }
  }

  let rootElement = document.getElementById('root') as HTMLElement;

  if (!rootElement) {
    throw new Error('Root element #root not found');
  }

  // Check if React has an internal root reference on the element
  // React 18 stores root references internally - we need to detect and handle this
  let elementAny = rootElement as any;
  const hasReactRoot = !!(
    elementAny._reactRootContainer ||
    elementAny._reactInternalFiber ||
    elementAny.__reactContainer$ ||
    elementAny.__reactFiber$ ||
    elementAny[Symbol.for('react.root')] ||
    // Check for React 18's internal root tracking
    (elementAny._owner && elementAny._owner.tag === 1)
  );

  // If element has React root markers but we don't have the root object,
  // we need to replace the element to avoid duplicate root warning
  if (hasReactRoot && !window.__olorin_root__) {
    const parent = rootElement.parentNode;
    if (parent) {
      // Replace element to get a fresh DOM node without React root references
      const newElement = document.createElement('div');
      newElement.id = 'root';
      parent.replaceChild(newElement, rootElement);
      rootElement = newElement;
      elementAny = rootElement as any; // Update reference
    } else {
      // Fallback: clear content completely
      rootElement.innerHTML = '';
      // Try to clear React internal refs
      Object.keys(elementAny).forEach(key => {
        if (key.startsWith('_react') || key.startsWith('__react') || key === Symbol.for('react.root')) {
          try {
            delete elementAny[key];
          } catch (e) {
            // Ignore non-configurable properties
          }
        }
      });
    }
  }

  // Prevent multiple initializations
  if (isInitialized && window.__olorin_root__) {
    // Already initialized and root exists, just re-render
    try {
      window.__olorin_root__.render(
        <React.StrictMode>
          <ShellErrorBoundary>
            <App />
          </ShellErrorBoundary>
        </React.StrictMode>
      );
      return;
    } catch (error) {
      // Root might be invalid, clear it and continue
      window.__olorin_root__ = undefined;
    }
  }
  
  isInitialized = true;

  let root: ReactDOM.Root | undefined;

  // Additional check for React root markers (reuse elementAny from above)
  // This is a secondary check after the initial element replacement logic
  const reactRootKey = Object.keys(elementAny).find(key => 
    key.startsWith('__reactFiber') || key.startsWith('__reactContainer')
  );
  
  if (reactRootKey && !window.__olorin_root__ && !hasReactRoot) {
    // React has a root but we don't have reference - replace element
    const parent = rootElement.parentNode;
    if (parent) {
      const newElement = document.createElement('div');
      newElement.id = 'root';
      parent.replaceChild(newElement, rootElement);
      rootElement = newElement;
      elementAny = rootElement as any; // Update reference
    }
  }

  // Create new root (element should be clean now)
  // Suppress React warning about duplicate roots - we handle this gracefully
  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Suppress React's duplicate root warning - we handle this case
    if (message.includes('createRoot') && message.includes('already been passed')) {
      return; // Suppress this specific warning
    }
    originalConsoleWarn.apply(console, args);
  };

  try {
    root = ReactDOM.createRoot(rootElement);
    window.__olorin_root__ = root;
  } catch (error: any) {
    // Restore console.warn before error handling
    console.warn = originalConsoleWarn;
    
    // If createRoot fails, React detected an existing root we couldn't clear
    const errorMessage = error?.message || String(error);
    const isDuplicateRootError = errorMessage.includes('already been passed to createRoot') ||
                                  errorMessage.includes('already has a root');
    
      if (isDuplicateRootError) {
      // React detected duplicate root - this can happen during HMR
      // Try to use existing root if available, otherwise replace element
      if (window.__olorin_root__) {
        // Use existing root
        root = window.__olorin_root__;
      } else {
        // Replace element to get a fresh DOM node
        const parent = rootElement.parentNode;
        const newElement = document.createElement('div');
        newElement.id = 'root';
        
        if (parent) {
          parent.replaceChild(newElement, rootElement);
          try {
            root = ReactDOM.createRoot(newElement);
            window.__olorin_root__ = root;
          } catch (retryError) {
            // Silently fail - HMR will handle recovery
            if (process.env.NODE_ENV === 'development') {
              console.debug('[Shell] Root recovery attempted during HMR');
            }
            return; // Exit gracefully - let HMR handle it
          }
        } else {
          // No parent - can't recover, but don't throw in development (HMR will handle)
          if (process.env.NODE_ENV === 'production') {
            throw new Error('Root element has no parent node. Please refresh the page.');
          }
          return; // Exit gracefully in development
        }
      }
    } else {
      // Other error - only throw in production
      if (process.env.NODE_ENV === 'production') {
        throw new Error('React root creation failed. This may indicate a module loading issue.');
      }
      // In development, let HMR handle recovery
      return;
    }
  } finally {
    // Always restore console.warn
    console.warn = originalConsoleWarn;
  }

  // Render the app (root should always exist at this point)
  if (!root) {
    throw new Error('Failed to obtain React root instance');
  }

  root.render(
    <React.StrictMode>
      <ShellErrorBoundary>
        <App />
      </ShellErrorBoundary>
    </React.StrictMode>
  );
};

// Export for bootstrap.tsx to call explicitly
// DO NOT call initializeShellApp() here - bootstrap.tsx will handle it
export { initializeShellApp };

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

// Performance monitoring - disabled console logging to reduce noise
// Web Vitals are still collected but not logged to console
if (process.env.NODE_ENV === 'development') {
  // Web Vitals reporting - silent mode
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    // Collect metrics but don't log them
    const noop = () => {};
    getCLS(noop);
    getFID(noop);
    getFCP(noop);
    getLCP(noop);
    getTTFB(noop);
  });
}

// Hot module replacement for development
if (module.hot && process.env.NODE_ENV === 'development') {
  // Persist root reference across HMR updates
  module.hot.dispose((data) => {
    data.root = window.__olorin_root__;
  });
  
  // Note: Root restoration happens at module level (above) before initialization
  
  module.hot.accept('./App', () => {
    // Ensure we have a root reference
    const currentRoot = window.__olorin_root__;
    if (!currentRoot) {
      console.error('[Shell] HMR: No root reference available');
      return;
    }
    
    // @ts-ignore - HMR requires dynamic require
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NextApp = require('./App').default;
    currentRoot.render(
      <React.StrictMode>
        <ShellErrorBoundary>
          <NextApp />
        </ShellErrorBoundary>
      </React.StrictMode>
    );
  });
}