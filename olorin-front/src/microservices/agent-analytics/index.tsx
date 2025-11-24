import React from 'react';
import ReactDOM from 'react-dom/client';
import mitt from 'mitt';
import { env } from '@shared/config/env.config';
import { EventBusManager } from '@shared/events/UnifiedEventBus';
import AgentAnalyticsApp from './AgentAnalyticsApp';
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
        <AgentAnalyticsApp />
      </React.StrictMode>
    );

    console.log('[agentanalytics] agentanalytics microservice initialized successfully');

    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:ready', { service: 'agent-analytics', timestamp: new Date() });
    }

  } catch (error) {
    console.error('[agentanalytics] Failed to initialize agentanalytics microservice:', error);
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
      console.log(`[agentanalytics] Registered service: ${name}`);
    },
    getService: (name: string) => {
      return window.olorin.services.get(name);
    }
  };
}

// Start the agentanalytics microservice
initializeagentanalyticsService().catch(error => {
  console.error('[agentanalytics] Critical initialization error:', error);
});

// Export for Module Federation
export { initializeagentanalyticsService };
