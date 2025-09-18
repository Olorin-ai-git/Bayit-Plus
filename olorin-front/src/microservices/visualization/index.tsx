import React from 'react';
import ReactDOM from 'react-dom/client';
import visualizationApp from './App';
import './styles/tailwind.css';

// Initialize the visualization Service
const initializevisualizationService = async () => {
  console.log('[visualization] Initializing visualization microservice...');

  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <visualizationApp />
      </React.StrictMode>
    );

    console.log('[visualization] visualization microservice initialized successfully');

    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:ready', { service: 'visualization' });
    }

  } catch (error) {
    console.error('[visualization] Failed to initialize visualization microservice:', error);
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
    console.log(`[visualization] Registered service: ${name}`);
  };

  window.olorin.getService = (name: string) => {
    return window.olorin.services[name];
  };
}

// Start the visualization microservice
initializevisualizationService().catch(error => {
  console.error('[visualization] Critical initialization error:', error);
});

// Export for Module Federation
export { initializevisualizationService };
