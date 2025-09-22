import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ManualInvestigationApp } from './ManualInvestigationApp';
import './styles/tailwind.css';

// Initialize the manualinvestigation Service
const initializemanualinvestigationService = async () => {
  console.log('[manualinvestigation] Initializing manualinvestigation microservice...');

  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <ManualInvestigationApp />
        </BrowserRouter>
      </React.StrictMode>
    );

    console.log('[manualinvestigation] manualinvestigation microservice initialized successfully');

    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:ready', { service: 'manual-investigation' });
    }

  } catch (error) {
    console.error('[manualinvestigation] Failed to initialize manualinvestigation microservice:', error);
    throw error;
  }
};

// Initialize global Olorin namespace if not already present
if (!window.olorin) {
  window.olorin = {
    version: '1.0.0',
    environment: 'development',
    services: {},
    eventBus: null,
    monitoring: null,
    config: {
      apiBaseUrl: 'http://localhost:8090',
      wsUrl: 'ws://localhost:8090',
      enableDebug: true
    }
  };

  window.olorin.registerService = (name: string, service: any) => {
    window.olorin.services[name] = service;
    console.log(`[manualinvestigation] Registered service: ${name}`);
  };

  window.olorin.getService = (name: string) => {
    return window.olorin.services[name];
  };
}

// Start the manualinvestigation microservice
initializemanualinvestigationService().catch(error => {
  console.error('[manualinvestigation] Critical initialization error:', error);
});

// Export for Module Federation
export { initializemanualinvestigationService };
export { ManualInvestigationApp } from './ManualInvestigationApp';
