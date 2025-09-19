import React from 'react';
import ReactDOM from 'react-dom/client';
import agentanalyticsApp from './App';
import './styles/tailwind.css';

// Initialize the agentanalytics Service
const initializeagentanalyticsService = async () => {
  console.log('[agentanalytics] Initializing agentanalytics microservice...');

  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <agentanalyticsApp />
      </React.StrictMode>
    );

    console.log('[agentanalytics] agentanalytics microservice initialized successfully');

    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:ready', { service: 'agent-analytics' });
    }

  } catch (error) {
    console.error('[agentanalytics] Failed to initialize agentanalytics microservice:', error);
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
    console.log(`[agentanalytics] Registered service: ${name}`);
  };

  window.olorin.getService = (name: string) => {
    return window.olorin.services[name];
  };
}

// Start the agentanalytics microservice
initializeagentanalyticsService().catch(error => {
  console.error('[agentanalytics] Critical initialization error:', error);
});

// Export for Module Federation
export { initializeagentanalyticsService };
