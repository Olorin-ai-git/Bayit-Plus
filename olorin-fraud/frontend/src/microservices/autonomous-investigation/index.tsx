import React from 'react';
import ReactDOM from 'react-dom/client';
import AutonomousInvestigationApp from './App';
import './styles/tailwind.css';

// Initialize the Autonomous Investigation Service
const initializeAutonomousInvestigationService = async () => {
  console.log('[AutonomousInvestigation] Initializing Autonomous Investigation microservice...');

  try {
    // Create root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = ReactDOM.createRoot(rootElement);

    // Render the Autonomous Investigation service app
    root.render(
      <React.StrictMode>
        <AutonomousInvestigationApp />
      </React.StrictMode>
    );

    console.log('[AutonomousInvestigation] Autonomous Investigation microservice initialized successfully');

    // Register service as ready
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:ready', { service: 'autonomousInvestigation' });
    }

  } catch (error) {
    console.error('[AutonomousInvestigation] Failed to initialize Autonomous Investigation microservice:', error);

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
            <h1 style="font-size: 1.25rem; font-weight: 600; color: #111827; margin-bottom: 0.5rem;">
              Autonomous Investigation Service Error
            </h1>
            <p style="color: #6b7280; margin-bottom: 1rem;">
              Failed to initialize Autonomous Investigation microservice.
            </p>
            <button onclick="window.location.reload()" style="background-color: #dc2626; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; border: none; cursor: pointer;">
              Reload Service
            </button>
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

  window.olorin.registerService = (name: string, service: any) => {
    window.olorin.services[name] = service;
    console.log(`[AutonomousInvestigation] Registered service: ${name}`);
  };

  window.olorin.getService = (name: string) => {
    return window.olorin.services[name];
  };
}

// Start the Autonomous Investigation microservice
initializeAutonomousInvestigationService().catch(error => {
  console.error('[AutonomousInvestigation] Critical initialization error:', error);
});

// Export for Module Federation
export { initializeAutonomousInvestigationService };