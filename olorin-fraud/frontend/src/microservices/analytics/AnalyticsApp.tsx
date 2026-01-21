/**
 * Main Analytics App Component
 *
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect } from 'react';
import { Routes, Route, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from '@shared/components/ui/ToastProvider';
import AnalyticsDashboard from './components/dashboard/AnalyticsDashboard';
import { AnomalyHubPage } from './pages/AnomalyHubPage';
import { DetectorStudioPage } from './pages/DetectorStudioPage';
import { ReplayStudioPage } from './pages/ReplayStudioPage';
import { analyticsEventBus } from './services/eventBus';
import './styles/tailwind.css';

const AnalyticsRoutes: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    // Debug logging for deep linking (development only)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics] Current location:', location.pathname);
    }

    const investigationId = searchParams.get('id');
    const timeWindow = searchParams.get('timeWindow');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const cohort = searchParams.get('cohort');
    const filters: Record<string, any> = {};

    if (investigationId) {
      filters.investigationId = investigationId;
      analyticsEventBus.publishNavigate({
        investigationId,
      });
    }

    if (timeWindow) {
      filters.timeWindow = timeWindow;
    }

    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }

    if (cohort) {
      filters.cohort = cohort;
    }

    if (Object.keys(filters).length > 0) {
      analyticsEventBus.publishFilterChanged({
        filters,
        source: 'deep_link',
      });
      analyticsEventBus.publishDeepLink(filters);
    }
  }, [searchParams, location]);

  // Handle deep linking - ensure routes match correctly
  // When shell routes /analytics/*, the remaining path (without leading slash) is passed here
  // Use relative paths (without leading slash) for nested routes
  // React Router v6 handles nested routes by matching the remaining path
  return (
    <Routes>
      <Route index element={<AnalyticsDashboard />} />
      <Route path="dashboard" element={<AnalyticsDashboard />} />
      <Route path="anomalies" element={<AnomalyHubPage />} />
      <Route path="detectors" element={<DetectorStudioPage />} />
      <Route path="detectors/:id" element={<DetectorStudioPage />} />
      <Route path="replay" element={<ReplayStudioPage />} />
      {/* Fallback for unmatched routes - redirect to analytics dashboard */}
      <Route path="*" element={<Navigate to="/analytics" replace />} />
    </Routes>
  );
};

const AnalyticsApp: React.FC = () => {
  useEffect(() => {
    if (window.olorin?.eventBus && typeof window.olorin.eventBus.emit === 'function') {
      try {
        window.olorin.eventBus.emit('service:ready', { service: 'analytics' });
      } catch (error) {
        // Silently handle event bus errors
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Analytics] Failed to emit service:ready event:', error);
        }
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AnalyticsRoutes />
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default AnalyticsApp;

