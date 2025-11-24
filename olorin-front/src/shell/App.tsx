/**
 * Shell Application
 *
 * Main shell application that coordinates all microservices.
 * Refactored to maintain < 200 line limit by extracting components and constants.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { EventBusManager, eventBus, EventBusProvider } from '@shared/events/UnifiedEventBus';
import { ToastProvider } from '@shared/components/ui/ToastProvider';
import { AuthProvider } from '../microservices/core-ui/components/AuthProvider';
import { InvestigationWizard } from '../microservices/investigation/containers/InvestigationWizard';
import Breadcrumbs from '@shared/components/Breadcrumbs';
import { serviceLinks } from './constants/serviceData';
import NavigationHeader from './components/NavigationHeader';
import ShellHomePage from './components/ShellHomePage';
import ServicePlaceholder from './components/ServicePlaceholder';
import SystemStatusPage from './components/SystemStatusPage';
import './globals';

const InvestigationApp = React.lazy(() => import('../microservices/investigation/InvestigationApp'));
const ComparisonPage = React.lazy(() => import('../microservices/investigation/pages/ComparisonPage'));
const RagIntelligenceApp = React.lazy(() => import('../microservices/rag-intelligence/RagIntelligenceApp'));
const ReportingApp = React.lazy(() => import('../microservices/reporting/ReportingApp'));
const VisualizationApp = React.lazy(() => import('../microservices/visualization/VisualizationApp'));
const InvestigationsManagementApp = React.lazy(() => import('../microservices/investigations-management/InvestigationsManagementApp'));
const AnalyticsApp = React.lazy(() => import('../microservices/analytics/AnalyticsApp'));

interface ShellState {
  isInitialized: boolean;
  error: string | null;
  servicesStatus: Record<string, 'ready' | 'loading' | 'error'>;
}

// Component to expose navigate function to window.olorin
const NavigationExposer: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Expose navigate function to window.olorin for cross-microservice navigation
    window.olorin.navigate = (path: string) => {
      navigate(path);
    };
    
    return () => {
      // Cleanup
      delete window.olorin.navigate;
    };
  }, [navigate]);
  
  return null;
};

const App: React.FC = () => {
  const [shellState, setShellState] = useState<ShellState>({
    isInitialized: false,
    error: null,
    servicesStatus: {}
  });

  useEffect(() => {
    initializeShell();
  }, []);

  const initializeShell = async () => {
    try {
      const eventBusManager = new EventBusManager();
      window.olorin.eventBus = eventBus;
      window.olorin.eventBusManager = eventBusManager;

      const servicesStatus = serviceLinks.reduce((acc, service) => {
        acc[service.name.toLowerCase()] = 'ready';
        return acc;
      }, {} as Record<string, 'ready' | 'loading' | 'error'>);

      setShellState({
        isInitialized: true,
        error: null,
        servicesStatus
      });

      // Shell initialization complete
    } catch (error) {
      console.error('[Shell] Shell initialization failed:', error);
      setShellState({
        isInitialized: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        servicesStatus: {}
      });
    }
  };

  if (!shellState.isInitialized && !shellState.error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-6">
            <img
              src="/assets/images/Olorin-Logo-With-Text-transparent.png"
              alt="Olorin Logo"
              className="h-20 w-auto animate-pulse filter drop-shadow-xl"
            />
          </div>
          <LoadingSpinner size="lg" />
          <h2 className="mt-6 text-2xl font-bold text-corporate-textPrimary">
            Initializing Olorin Platform
          </h2>
          <p className="mt-2 text-corporate-textSecondary">
            Setting up AI-powered fraud detection services...
          </p>
        </div>
      </div>
    );
  }

  if (shellState.error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md w-full bg-black/40 backdrop-blur shadow-xl rounded-lg p-8 border border-corporate-error">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-lg mb-6 border-2 border-corporate-error bg-black/50 backdrop-blur">
            <svg className="w-8 h-8 text-corporate-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-corporate-textPrimary text-center mb-4">
            Platform Error
          </h1>
          <p className="text-corporate-textSecondary text-center mb-6">
            {shellState.error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-corporate-error/80 backdrop-blur text-white px-6 py-3 rounded-lg hover:bg-corporate-error transition-all duration-200 font-medium border border-corporate-error"
          >
            Restart Platform
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary serviceName="shell">
      <EventBusProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <NavigationExposer />
            <div className="shell-application min-h-screen bg-black">
              <NavigationHeader />
              <Breadcrumbs />

            <main>
              <Routes>
                <Route path="/" element={<ShellHomePage />} />
                <Route path="/compare" element={
                  <ErrorBoundary serviceName="investigation">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <LoadingSpinner size="md" />
                          <p className="mt-2 text-sm text-corporate-textSecondary">
                            Loading Comparison Page...
                          </p>
                        </div>
                      </div>
                    }>
                      <ComparisonPage />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/investigations/*" element={
                  <ErrorBoundary serviceName="investigation">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <LoadingSpinner size="md" />
                          <p className="mt-2 text-sm text-corporate-textSecondary">
                            Loading Investigation Service...
                          </p>
                        </div>
                      </div>
                    }>
                      <InvestigationApp />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/investigation/*" element={<InvestigationWizard />} />
                <Route path="/analytics/*" element={
                  <ErrorBoundary serviceName="analytics">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <LoadingSpinner size="md" />
                          <p className="mt-2 text-sm text-corporate-textSecondary">
                            Loading Analytics Service...
                          </p>
                        </div>
                      </div>
                    }>
                      <AnalyticsApp />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/rag/*" element={
                  <ErrorBoundary serviceName="rag-intelligence">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <LoadingSpinner size="md" />
                          <p className="mt-2 text-sm text-corporate-textSecondary">
                            Loading Knowledge Base...
                          </p>
                        </div>
                      </div>
                    }>
                      <RagIntelligenceApp />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/visualization/*" element={
                  <ErrorBoundary serviceName="visualization">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <LoadingSpinner size="md" />
                          <p className="mt-2 text-sm text-corporate-textSecondary">
                            Loading Visualization Service...
                          </p>
                        </div>
                      </div>
                    }>
                      <VisualizationApp />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/reports" element={
                  <ErrorBoundary serviceName="reporting">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <LoadingSpinner size="md" />
                          <p className="mt-2 text-sm text-corporate-textSecondary">
                            Loading Reports Service...
                          </p>
                        </div>
                      </div>
                    }>
                      <ReportingApp />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/reports/*" element={
                  <ErrorBoundary serviceName="reporting">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <LoadingSpinner size="md" />
                          <p className="mt-2 text-sm text-corporate-textSecondary">
                            Loading Reports Service...
                          </p>
                        </div>
                      </div>
                    }>
                      <ReportingApp />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/reporting" element={
                  <ErrorBoundary serviceName="reporting">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <LoadingSpinner size="md" />
                          <p className="mt-2 text-sm text-corporate-textSecondary">
                            Loading Reports Service...
                          </p>
                        </div>
                      </div>
                    }>
                      <ReportingApp />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/reporting/*" element={
                  <ErrorBoundary serviceName="reporting">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <LoadingSpinner size="md" />
                          <p className="mt-2 text-sm text-corporate-textSecondary">
                            Loading Reports Service...
                          </p>
                        </div>
                      </div>
                    }>
                      <ReportingApp />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/status" element={<SystemStatusPage />} />
                <Route path="/investigations-management/*" element={
                  <ErrorBoundary serviceName="investigations-management">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <LoadingSpinner size="md" />
                          <p className="mt-2 text-sm text-corporate-textSecondary">
                            Loading Investigations Management...
                          </p>
                        </div>
                      </div>
                    }>
                      <InvestigationsManagementApp />
                    </Suspense>
                  </ErrorBoundary>
                } />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </EventBusProvider>
    </ErrorBoundary>
  );
};

export default App;
