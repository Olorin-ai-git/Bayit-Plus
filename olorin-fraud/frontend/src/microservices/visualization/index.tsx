import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import VisualizationApp from './VisualizationApp';
import './styles/tailwind.css';

// Global reference to prevent creating multiple roots
declare global {
  interface Window {
    __visualization_root__?: ReactDOM.Root;
  }
}

// Initialize the Visualization Service
const initializeVisualizationService = async () => {
  // Initializing visualization microservice

  try {
    // Check if running in shell mode (visualization-root exists) - skip root creation
    const visualizationRootElement = document.getElementById('visualization-root');
    if (visualizationRootElement) {
      console.log('[Visualization] Running in shell mode, skipping root creation');
      return;
    }

    // Standalone mode: use root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    // Prevent multiple root creation
    if (!window.__visualization_root__) {
      window.__visualization_root__ = ReactDOM.createRoot(rootElement);
    }

    const root = window.__visualization_root__;

    root.render(
      <React.StrictMode>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <VisualizationApp />
        </BrowserRouter>
      </React.StrictMode>
    );

    // Visualization microservice initialized successfully

    if (window.olorin?.eventBus && typeof window.olorin.eventBus.emit === 'function') {
      try {
        window.olorin.eventBus.emit('service:ready', { service: 'visualization' });
      } catch (error) {
        console.warn('[Visualization] Failed to emit service:ready event:', error);
      }
    }

  } catch (error) {
    console.error('[Visualization] Failed to initialize visualization microservice:', error);
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
      apiBaseUrl: (() => {
        const url = process.env.REACT_APP_API_BASE_URL;
        if (!url) {
          throw new Error(
            'CRITICAL: REACT_APP_API_BASE_URL is not set. ' +
            'Set it in your .env file. No fallback allowed for security.'
          );
        }
        return url;
      })(),
      wsUrl: (() => {
        const url = process.env.REACT_APP_WS_URL;
        if (!url) {
          throw new Error(
            'CRITICAL: REACT_APP_WS_URL is not set. ' +
            'Set it in your .env file. No fallback allowed for security.'
          );
        }
        return url;
      })(),
      enableDebug: process.env.NODE_ENV === 'development'
    }
  };

  window.olorin.registerService = (name: string, service: any) => {
    window.olorin.services[name] = service;
    console.log(`[Visualization] Registered service: ${name}`);
  };

  window.olorin.getService = (name: string) => {
    return window.olorin.services[name];
  };
}

// Only auto-initialize in standalone mode (when visualization-root doesn't exist)
// In shell mode, bootstrap.tsx will handle initialization
if (!document.getElementById('visualization-root')) {
  // Start the Visualization microservice
  initializeVisualizationService().catch(error => {
    console.error('[Visualization] Critical initialization error:', error);
  });
} else {
  console.log('[Visualization] Running in shell mode, skipping auto-initialization');
}

// Export for Module Federation
export { initializeVisualizationService };

// Re-export all visualization components, hooks, and utilities for easy imports
// This allows: import { RiskGauge, useRiskUpdates } from '@microservices/visualization'
export * from './components/risk';
export * from './hooks';
export * from './utils';
