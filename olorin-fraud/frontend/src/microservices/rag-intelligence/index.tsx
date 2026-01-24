import React from 'react';
import ReactDOM from 'react-dom/client';
import ragintelligenceApp from './App';
import './styles/tailwind.css';

// Initialize the ragintelligence Service
const initializeragintelligenceService = async () => {
  console.log('[ragintelligence] Initializing ragintelligence microservice...');

  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <ragintelligenceApp />
      </React.StrictMode>
    );

    console.log('[ragintelligence] ragintelligence microservice initialized successfully');

    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:ready', { service: 'rag-intelligence' });
    }

  } catch (error) {
    console.error('[ragintelligence] Failed to initialize ragintelligence microservice:', error);
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
      apiBaseUrl: process.env.REACT_APP_API_BASE_URL || (() => {
        throw new Error('CRITICAL: REACT_APP_API_BASE_URL is not set. Set it in your .env file. No fallback allowed for security.');
      })(),
      wsUrl: process.env.REACT_APP_WS_URL || (() => {
        throw new Error('CRITICAL: REACT_APP_WS_URL is not set. Set it in your .env file. No fallback allowed for security.');
      })(),
      enableDebug: process.env.NODE_ENV === 'development'
    }
  };

  window.olorin.registerService = (name: string, service: any) => {
    window.olorin.services[name] = service;
    console.log(`[ragintelligence] Registered service: ${name}`);
  };

  window.olorin.getService = (name: string) => {
    return window.olorin.services[name];
  };
}

// Start the ragintelligence microservice
initializeragintelligenceService().catch(error => {
  console.error('[ragintelligence] Critical initialization error:', error);
});

// Export for Module Federation
export { initializeragintelligenceService };
