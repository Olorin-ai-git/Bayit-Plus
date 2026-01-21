import React from 'react';
import ReactDOM from 'react-dom/client';
import mitt from 'mitt';
import { env } from '@shared/config/env.config';
import { EventBusManager } from '@shared/events/UnifiedEventBus';
import './styles/tailwind.css';

// Standalone CoreUI App (no remote imports)
const StandaloneCoreUIApp: React.FC = () => {
  return (
    <div className="core-ui-service min-h-screen bg-gray-50">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Core UI Service
          </h1>
          <p className="text-gray-600 mb-4">
            Core UI service is running independently. This service provides shared components for other microservices.
          </p>
          <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Health</h3>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
              <span className="text-green-800">Service is operational</span>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <div>Port: 3006</div>
              <div>Mode: Standalone</div>
              <div>Status: Ready</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Initialize the Core UI Service
const initializeCoreUIService = async () => {
  console.log('[CoreUI] Initializing Core UI microservice...');

  try {
    // Create root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = ReactDOM.createRoot(rootElement);

    // Render the Core UI service app (standalone mode)
    root.render(
      <React.StrictMode>
        <StandaloneCoreUIApp />
      </React.StrictMode>
    );

    console.log('[CoreUI] Core UI microservice initialized successfully');

    // Register service as ready
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:ready', { service: 'coreUi', timestamp: new Date() });
    }

  } catch (error) {
    console.error('[CoreUI] Failed to initialize Core UI microservice:', error);

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
              Core UI Service Error
            </h1>
            <p style="color: #6b7280; margin-bottom: 1rem;">
              Failed to initialize Core UI microservice. Please check the console for details.
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
            >
              Reload Service
            </button>
          </div>
        </div>
      `;
    }

    throw error;
  }
};

// Initialize global Olorin namespace if not already present (for standalone mode)
// In production, this will be provided by the shell app
if (!window.olorin) {
  const eventBusInstance = mitt();
  const eventBusManagerInstance = EventBusManager.getInstance();

  window.olorin = {
    version: env.appVersion,
    services: new Map<string, any>(),
    eventBus: eventBusInstance,
    eventBusManager: eventBusManagerInstance,
    registerService: (name: string, service: any) => {
      window.olorin.services.set(name, service);
      console.log(`[CoreUI] Registered service: ${name}`);
    },
    getService: (name: string) => {
      return window.olorin.services.get(name);
    }
  };
}

// Start the Core UI microservice
initializeCoreUIService().catch(error => {
  console.error('[CoreUI] Critical initialization error:', error);
});

// Export for Module Federation
export { initializeCoreUIService };