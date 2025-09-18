import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import InvestigationApp from './InvestigationApp';
import './styles/tailwind.css';

// Initialize the Investigation Service
const initializeInvestigationService = async () => {
  console.log('[Investigation] Initializing Investigation microservice...');

  try {
    // Create root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = ReactDOM.createRoot(rootElement);

    // Render the Investigation service app
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <InvestigationApp />
        </BrowserRouter>
      </React.StrictMode>
    );

    console.log('[Investigation] Investigation microservice initialized successfully');

    // Register service as ready
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:ready', { service: 'investigation' });
    }

  } catch (error) {
    console.error('[Investigation] Failed to initialize Investigation microservice:', error);

    // Show error UI
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #fef2f2;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          <div style="
            max-width: 24rem;
            width: 100%;
            background-color: white;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            border-radius: 0.5rem;
            padding: 1.5rem;
            text-align: center;
          ">
            <div style="
              width: 3rem;
              height: 3rem;
              margin: 0 auto 1rem;
              background-color: #fee2e2;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg style="width: 1.5rem; height: 1.5rem; color: #dc2626;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 style="font-size: 1.25rem; font-weight: 600; color: #111827; margin-bottom: 0.5rem;">
              Investigation Service Error
            </h1>
            <p style="color: #6b7280; margin-bottom: 1rem;">
              Failed to initialize Investigation microservice. Please check the console for details.
            </p>
            <button
              onclick="window.location.reload()"
              style="
                width: 100%;
                background-color: #dc2626;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 0.375rem;
                border: none;
                cursor: pointer;
                font-weight: 500;
              "
              onmouseover="this.style.backgroundColor='#b91c1c'"
              onmouseout="this.style.backgroundColor='#dc2626'"
            >
              Reload Service
            </button>
            ${process.env.NODE_ENV === 'development' ? `
              <details style="margin-top: 1rem; padding: 0.75rem; background-color: #f3f4f6; border-radius: 0.375rem; text-align: left;">
                <summary style="cursor: pointer; font-weight: 500; font-size: 0.875rem;">Error Details</summary>
                <pre style="margin-top: 0.5rem; white-space: pre-wrap; color: #dc2626; font-size: 0.75rem;">
                  ${error instanceof Error ? error.message + '\n' + error.stack : String(error)}
                </pre>
              </details>
            ` : ''}
          </div>
        </div>
      `;
    }

    throw error;
  }
};

// Initialize global Olorin namespace if not already present
if (!window.olorin) {
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
    console.log(`[Investigation] Registered service: ${name}`);
  };

  // Get service helper
  window.olorin.getService = (name: string) => {
    return window.olorin.services[name];
  };
}

// Start the Investigation microservice
initializeInvestigationService().catch(error => {
  console.error('[Investigation] Critical initialization error:', error);
});

// Export for Module Federation
export { initializeInvestigationService };