import React from 'react';
import ReactDOM from 'react-dom/client';
import reportingApp from './App';
import './styles/tailwind.css';

// Initialize the reporting Service
const initializereportingService = async () => {
  console.log('[reporting] Initializing reporting microservice...');

  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <reportingApp />
      </React.StrictMode>
    );

    console.log('[reporting] reporting microservice initialized successfully');

    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:ready', { service: 'reporting' });
    }

  } catch (error) {
    console.error('[reporting] Failed to initialize reporting microservice:', error);
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
    console.log(`[reporting] Registered service: ${name}`);
  };

  window.olorin.getService = (name: string) => {
    return window.olorin.services[name];
  };
}

// Start the reporting microservice
initializereportingService().catch(error => {
  console.error('[reporting] Critical initialization error:', error);
});

// Export for Module Federation
export { initializereportingService };
