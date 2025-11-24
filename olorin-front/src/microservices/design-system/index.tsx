import React from 'react';
import ReactDOM from 'react-dom/client';
<<<<<<< HEAD
import designsystemApp from './App';
=======
import DesignSystemApp from './DesignSystemApp';
>>>>>>> 001-modify-analyzer-method
import './styles/tailwind.css';

// Initialize the designsystem Service
const initializedesignsystemService = async () => {
  console.log('[designsystem] Initializing designsystem microservice...');

  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <React.StrictMode>
<<<<<<< HEAD
        <designsystemApp />
=======
        <DesignSystemApp />
>>>>>>> 001-modify-analyzer-method
      </React.StrictMode>
    );

    console.log('[designsystem] designsystem microservice initialized successfully');

    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:ready', { service: 'design-system' });
    }

  } catch (error) {
    console.error('[designsystem] Failed to initialize designsystem microservice:', error);
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
    console.log(`[designsystem] Registered service: ${name}`);
  };

  window.olorin.getService = (name: string) => {
    return window.olorin.services[name];
  };
}

// Start the designsystem microservice
initializedesignsystemService().catch(error => {
  console.error('[designsystem] Critical initialization error:', error);
});

// Export for Module Federation
export { initializedesignsystemService };
