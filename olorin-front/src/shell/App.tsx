import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EventBus } from '@shared/events/EventBus';
import { ServiceDiscovery } from './services/ServiceDiscovery';
import { ServiceHealthMonitor } from './services/ServiceHealthMonitor';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

const CoreUI = React.lazy(() => import('coreUi/Layout'));
const Navigation = React.lazy(() => import('coreUi/Navigation'));
const Header = React.lazy(() => import('coreUi/Header'));
const InvestigationDashboard = React.lazy(() => import('investigation/InvestigationDashboard'));
const AgentAnalyticsDashboard = React.lazy(() => import('agentAnalytics/AgentAnalyticsDashboard'));
const KnowledgeBase = React.lazy(() => import('ragIntelligence/KnowledgeBase'));
const DataVisualization = React.lazy(() => import('visualization/DataVisualization'));
const ReportDashboard = React.lazy(() => import('reporting/ReportDashboard'));

interface ShellState {
  isInitialized: boolean;
  services: ServiceStatus[];
  error: string | null;
}

interface ServiceStatus {
  name: string;
  status: 'loading' | 'ready' | 'error';
  port: number;
  url: string;
}

const App: React.FC = () => {
  const [shellState, setShellState] = useState<ShellState>({
    isInitialized: false,
    services: [],
    error: null
  });

  useEffect(() => {
    initializeShell();
  }, []);

  const initializeShell = async () => {
    try {
      // Initialize event bus
      const eventBus = new EventBus();
      window.olorin.eventBus = eventBus;

      // Initialize service discovery
      const serviceDiscovery = new ServiceDiscovery();
      window.olorin.registerService('serviceDiscovery', serviceDiscovery);

      // Initialize health monitoring
      const healthMonitor = new ServiceHealthMonitor();
      window.olorin.registerService('healthMonitor', healthMonitor);

      // Discover and register microservices
      const services = await serviceDiscovery.discoverServices();
      setShellState(prev => ({
        ...prev,
        services,
        isInitialized: true
      }));

      // Start health monitoring
      healthMonitor.startMonitoring(services);

      // Set up global error handling
      eventBus.on('service:error', handleServiceError);
      eventBus.on('service:ready', handleServiceReady);

      console.log('[Olorin Shell] Shell initialized successfully');
    } catch (error) {
      console.error('[Olorin Shell] Failed to initialize shell:', error);
      setShellState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isInitialized: false
      }));
    }
  };

  const handleServiceError = (data: { service: string; error: string }) => {
    console.error(`[Olorin Shell] Service error in ${data.service}:`, data.error);
    setShellState(prev => ({
      ...prev,
      services: prev.services.map(service =>
        service.name === data.service
          ? { ...service, status: 'error' }
          : service
      )
    }));
  };

  const handleServiceReady = (data: { service: string }) => {
    console.log(`[Olorin Shell] Service ${data.service} is ready`);
    setShellState(prev => ({
      ...prev,
      services: prev.services.map(service =>
        service.name === data.service
          ? { ...service, status: 'ready' }
          : service
      )
    }));
  };

  if (shellState.error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Shell Initialization Error
          </h1>
          <p className="text-gray-600 text-center mb-4">
            {shellState.error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  if (!shellState.isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">
            Initializing Olorin Shell
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Discovering and loading microservices...
          </p>
          {shellState.services.length > 0 && (
            <div className="mt-4 max-w-sm mx-auto">
              <div className="space-y-2">
                {shellState.services.map(service => (
                  <div key={service.name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{service.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.status === 'ready' ? 'bg-green-100 text-green-800' :
                      service.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {service.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <Suspense fallback={<LoadingSpinner size="lg" />}>
            <Header />
            <div className="flex">
              <Navigation />
              <main className="flex-1 min-h-screen">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <LoadingSpinner size="md" />
                  </div>
                }>
                  <Routes>
                    {/* Investigation Routes */}
                    <Route path="/investigations/*" element={
                      <ErrorBoundary serviceName="investigation">
                        <InvestigationDashboard />
                      </ErrorBoundary>
                    } />

                    {/* Agent Analytics Routes */}
                    <Route path="/analytics/*" element={
                      <ErrorBoundary serviceName="agentAnalytics">
                        <AgentAnalyticsDashboard />
                      </ErrorBoundary>
                    } />

                    {/* RAG Intelligence Routes */}
                    <Route path="/knowledge/*" element={
                      <ErrorBoundary serviceName="ragIntelligence">
                        <KnowledgeBase />
                      </ErrorBoundary>
                    } />

                    {/* Visualization Routes */}
                    <Route path="/visualization/*" element={
                      <ErrorBoundary serviceName="visualization">
                        <DataVisualization />
                      </ErrorBoundary>
                    } />

                    {/* Reporting Routes */}
                    <Route path="/reports/*" element={
                      <ErrorBoundary serviceName="reporting">
                        <ReportDashboard />
                      </ErrorBoundary>
                    } />

                    {/* Default Route */}
                    <Route path="/" element={<Navigate to="/investigations" replace />} />

                    {/* Catch-all Route */}
                    <Route path="*" element={
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold text-gray-900 mb-2">404 - Page Not Found</h1>
                          <p className="text-gray-600">The requested page could not be found.</p>
                        </div>
                      </div>
                    } />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </Suspense>
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;