/**
 * Financial Analysis Microservice Entry Point
 * Feature: 025-financial-analysis-frontend
 *
 * Initializes the financial analysis microservice for Module Federation.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import FinancialAnalysisApp from './FinancialAnalysisApp';
import './styles/tailwind.css';
import { initializeRuntimeConfig } from '../../shared/config/runtimeConfig';

initializeRuntimeConfig();

const initializeFinancialAnalysisService = async () => {
  console.log('[FinancialAnalysis] Initializing Financial Analysis microservice...');

  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <FinancialAnalysisApp />
        </BrowserRouter>
      </React.StrictMode>
    );

    console.log('[FinancialAnalysis] Financial Analysis microservice initialized successfully');

    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:ready', { service: 'financial-analysis' });
    }
  } catch (error) {
    console.error('[FinancialAnalysis] Failed to initialize:', error);
    throw error;
  }
};

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
      enableDebug: process.env.NODE_ENV === 'development',
    },
  };

  window.olorin.registerService = (name: string, service: unknown) => {
    window.olorin.services[name] = service;
    console.log(`[FinancialAnalysis] Registered service: ${name}`);
  };

  window.olorin.getService = (name: string) => {
    return window.olorin.services[name];
  };
}

initializeFinancialAnalysisService().catch((error) => {
  console.error('[FinancialAnalysis] Critical initialization error:', error);
});

export { initializeFinancialAnalysisService };
