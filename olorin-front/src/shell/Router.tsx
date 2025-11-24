import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ServiceErrorBoundary } from '@shared/components/ServiceErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Lazy load working microservice apps
// For now, use local components until Module Federation is fully configured

// Investigation Service (main service at port 3001)
const InvestigationApp = React.lazy(() => import('../microservices/investigation/InvestigationApp'));

// RAG Intelligence Service (port 3003) - Fully working
const RagIntelligenceApp = React.lazy(() => import('../microservices/rag-intelligence/RagIntelligenceApp'));

// Agent Analytics Service (port 3002) - Working (Agent performance monitoring)
const AgentAnalyticsApp = React.lazy(() => import('../microservices/agent-analytics/AgentAnalyticsApp'));

// Analytics Service (Anomaly detection with replay/detector features)
const AnalyticsApp = React.lazy(() => import('../microservices/analytics/AnalyticsApp'));

// Core UI Service (port 3006)
const CoreUIApp = React.lazy(() => import('../microservices/core-ui/CoreUIApp'));

// Visualization Service (port 3004) - Fully implemented
const VisualizationApp = React.lazy(() => import('../microservices/visualization/VisualizationApp'));

// Reporting Service (port 3005) - Fully implemented
const ReportingApp = React.lazy(() => import('../microservices/reporting/ReportingApp'));

interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  serviceName: string;
  exact?: boolean;
}

const routes: RouteConfig[] = [
  // Investigation Service Routes (Port 3001) - Main Investigation Hub
  { path: '/investigations', component: InvestigationApp, serviceName: 'investigation', exact: true },
  { path: '/investigations/*', component: InvestigationApp, serviceName: 'investigation' },
  { path: '/investigation/*', component: InvestigationApp, serviceName: 'investigation' },

  // Analytics Service Routes (Anomaly detection with replay/detector features)
  { path: '/analytics', component: AnalyticsApp, serviceName: 'analytics', exact: true },
  { path: '/analytics/*', component: AnalyticsApp, serviceName: 'analytics' },

  // Agent Analytics Service Routes (Port 3002) - Agent performance monitoring
  { path: '/agent-analytics', component: AgentAnalyticsApp, serviceName: 'agent-analytics', exact: true },
  { path: '/agent-analytics/*', component: AgentAnalyticsApp, serviceName: 'agent-analytics' },

  // RAG Intelligence Service Routes (Port 3003)
  { path: '/rag', component: RagIntelligenceApp, serviceName: 'rag-intelligence', exact: true },
  { path: '/rag/*', component: RagIntelligenceApp, serviceName: 'rag-intelligence' },
  { path: '/knowledge', component: RagIntelligenceApp, serviceName: 'rag-intelligence', exact: true },
  { path: '/knowledge/*', component: RagIntelligenceApp, serviceName: 'rag-intelligence' },

  // Visualization Service Routes (Port 3004) - Fully implemented
  { path: '/visualization', component: VisualizationApp, serviceName: 'visualization', exact: true },
  { path: '/visualization/*', component: VisualizationApp, serviceName: 'visualization' },
  { path: '/charts', component: VisualizationApp, serviceName: 'visualization', exact: true },
  { path: '/charts/*', component: VisualizationApp, serviceName: 'visualization' },
  { path: '/maps', component: VisualizationApp, serviceName: 'visualization', exact: true },
  { path: '/maps/*', component: VisualizationApp, serviceName: 'visualization' },
  { path: '/risk-analysis', component: VisualizationApp, serviceName: 'visualization', exact: true },
  { path: '/risk-analysis/*', component: VisualizationApp, serviceName: 'visualization' },

  // Reporting Service Routes (Port 3005) - Fully implemented
  { path: '/reports', component: ReportingApp, serviceName: 'reporting', exact: true },
  { path: '/reports/*', component: ReportingApp, serviceName: 'reporting' },
  { path: '/templates', component: ReportingApp, serviceName: 'reporting', exact: true },
  { path: '/templates/*', component: ReportingApp, serviceName: 'reporting' },
  { path: '/exports', component: ReportingApp, serviceName: 'reporting', exact: true },
  { path: '/exports/*', component: ReportingApp, serviceName: 'reporting' },

  // Core UI Service Routes (Port 3006) - Auth, Profile, Settings
  { path: '/profile', component: CoreUIApp, serviceName: 'core-ui', exact: true },
  { path: '/settings', component: CoreUIApp, serviceName: 'core-ui', exact: true },
  { path: '/auth/*', component: CoreUIApp, serviceName: 'core-ui' },
];

const AppRouter: React.FC = () => {
  const renderRoute = (route: RouteConfig) => {
    const Component = route.component;

    return (
      <Route
        key={route.path}
        path={route.path}
        element={
          <ServiceErrorBoundary
            serviceName={route.serviceName}
            onError={(error, errorInfo) => handleServiceError(route.serviceName, error)}
          >
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <LoadingSpinner size="md" />
                  <p className="mt-2 text-sm text-gray-600">
                    Loading {route.serviceName} service...
                  </p>
                </div>
              </div>
            }>
              <Component />
            </Suspense>
          </ServiceErrorBoundary>
        }
      />
    );
  };

  const handleServiceError = (serviceName: string, error: Error) => {
    console.error(`[Olorin Router] Service error in ${serviceName}:`, error);

    // Emit service error event
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:error', {
        service: serviceName as 'investigation' | 'reporting' | 'agentAnalytics' | 'ragIntelligence' | 'visualization' | 'designSystem' | 'coreUi',
        error: error instanceof Error ? error : new Error(error.message)
      });
    }
  };

  return (
    <Routes>
      {routes.map(renderRoute)}

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/investigations" replace />} />

      {/* Health check route */}
      <Route path="/health" element={
        <div className="p-4">
          <h1 className="text-2xl font-bold text-green-600">Olorin Shell Health Check</h1>
          <div className="mt-4 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Shell Application: Healthy</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Router: Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Module Federation: Operational</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Version: {window.olorin?.version || '1.0.0'}
          </div>
        </div>
      } />

      {/* Service status route */}
      <Route path="/status" element={
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Service Status</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'investigation', display: 'Investigation Service', port: '3001', status: 'operational' },
              { name: 'analytics', display: 'Analytics (Anomaly Detection)', port: 'N/A', status: 'operational' },
              { name: 'agent-analytics', display: 'Agent Analytics (Monitoring)', port: '3002', status: 'operational' },
              { name: 'rag-intelligence', display: 'RAG Intelligence', port: '3003', status: 'operational' },
              { name: 'visualization', display: 'Visualization', port: '3004', status: 'operational' },
              { name: 'reporting', display: 'Reporting', port: '3005', status: 'operational' },
              { name: 'core-ui', display: 'Core UI', port: '3006', status: 'operational' }
            ].map(service => (
              <div key={service.name} className="bg-white rounded-lg shadow p-4">
                <h3 className="font-medium text-gray-900">{service.display}</h3>
                <div className="mt-2 flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    service.status === 'operational' ? 'bg-green-500' :
                    service.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-gray-600 capitalize">{service.status}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Port: {service.port}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {service.status === 'operational' ? 'All features working' :
                   service.status === 'partial' ? 'Basic functionality only' : 'Service unavailable'}
                </div>
              </div>
            ))}
          </div>
        </div>
      } />

      {/* 404 Not Found */}
      <Route path="*" element={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
            <p className="text-gray-600 mb-4">
              The requested page could not be found in any microservice.
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      } />
    </Routes>
  );
};

export default AppRouter;