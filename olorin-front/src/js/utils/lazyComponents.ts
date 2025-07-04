/**
 * Enhanced Lazy Loading Utilities for Maximum Performance
 * Aggressive code splitting for bundle size optimization
 */

import React, { lazy } from 'react';

// Lazy load heavy page components for better initial bundle size
export const LazyInvestigationPage = lazy(
  () => import('../pages/InvestigationPage'),
);

export const LazySettingsPage = lazy(() => import('../pages/Settings'));

export const LazyRAGPage = lazy(() => import('../pages/RAGPage'));

// Simple loading fallback factory function
export const createLoadingFallback = (message: string = 'Loading...') => {
  return function LoadingComponent() {
    return null; // Simple fallback for now
  };
};
