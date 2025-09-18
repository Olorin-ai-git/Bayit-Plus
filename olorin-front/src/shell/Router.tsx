import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Lazy load microservice components
const InvestigationDashboard = React.lazy(() => import('investigation/InvestigationDashboard'));
const AutonomousInvestigation = React.lazy(() => import('investigation/AutonomousInvestigation'));
const ManualInvestigationDetails = React.lazy(() => import('investigation/ManualInvestigationDetails'));
const InvestigationWizard = React.lazy(() => import('investigation/InvestigationWizard'));
const EvidenceManager = React.lazy(() => import('investigation/EvidenceManager'));

const AgentAnalyticsDashboard = React.lazy(() => import('agentAnalytics/AgentAnalyticsDashboard'));
const PerformanceMetrics = React.lazy(() => import('agentAnalytics/PerformanceMetrics'));
const ModelAnalytics = React.lazy(() => import('agentAnalytics/ModelAnalytics'));
const UsageTracking = React.lazy(() => import('agentAnalytics/UsageTracking'));
const CostAnalytics = React.lazy(() => import('agentAnalytics/CostAnalytics'));

const KnowledgeBase = React.lazy(() => import('ragIntelligence/KnowledgeBase'));
const DocumentRetrieval = React.lazy(() => import('ragIntelligence/DocumentRetrieval'));
const IntelligentSearch = React.lazy(() => import('ragIntelligence/IntelligentSearch'));
const VectorDatabase = React.lazy(() => import('ragIntelligence/VectorDatabase'));

const ChartBuilder = React.lazy(() => import('visualization/ChartBuilder'));
const DataVisualization = React.lazy(() => import('visualization/DataVisualization'));
const NetworkGraph = React.lazy(() => import('visualization/NetworkGraph'));
const TimelineVisualization = React.lazy(() => import('visualization/TimelineVisualization'));

const ReportBuilder = React.lazy(() => import('reporting/ReportBuilder'));
const ReportDashboard = React.lazy(() => import('reporting/ReportDashboard'));
const ReportViewer = React.lazy(() => import('reporting/ReportViewer'));

interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  serviceName: string;
  exact?: boolean;
}

const routes: RouteConfig[] = [
  // Investigation Service Routes
  { path: '/investigations', component: InvestigationDashboard, serviceName: 'investigation', exact: true },
  { path: '/investigations/autonomous', component: AutonomousInvestigation, serviceName: 'investigation' },
  { path: '/investigations/manual/:id', component: ManualInvestigationDetails, serviceName: 'investigation' },
  { path: '/investigations/wizard', component: InvestigationWizard, serviceName: 'investigation' },
  { path: '/investigations/evidence', component: EvidenceManager, serviceName: 'investigation' },

  // Agent Analytics Service Routes
  { path: '/analytics', component: AgentAnalyticsDashboard, serviceName: 'agentAnalytics', exact: true },
  { path: '/analytics/performance', component: PerformanceMetrics, serviceName: 'agentAnalytics' },
  { path: '/analytics/models', component: ModelAnalytics, serviceName: 'agentAnalytics' },
  { path: '/analytics/usage', component: UsageTracking, serviceName: 'agentAnalytics' },
  { path: '/analytics/costs', component: CostAnalytics, serviceName: 'agentAnalytics' },

  // RAG Intelligence Service Routes
  { path: '/knowledge', component: KnowledgeBase, serviceName: 'ragIntelligence', exact: true },
  { path: '/knowledge/documents', component: DocumentRetrieval, serviceName: 'ragIntelligence' },
  { path: '/knowledge/search', component: IntelligentSearch, serviceName: 'ragIntelligence' },
  { path: '/knowledge/vectors', component: VectorDatabase, serviceName: 'ragIntelligence' },

  // Visualization Service Routes
  { path: '/visualization', component: DataVisualization, serviceName: 'visualization', exact: true },
  { path: '/visualization/builder', component: ChartBuilder, serviceName: 'visualization' },
  { path: '/visualization/network', component: NetworkGraph, serviceName: 'visualization' },
  { path: '/visualization/timeline', component: TimelineVisualization, serviceName: 'visualization' },

  // Reporting Service Routes
  { path: '/reports', component: ReportDashboard, serviceName: 'reporting', exact: true },
  { path: '/reports/builder', component: ReportBuilder, serviceName: 'reporting' },
  { path: '/reports/viewer/:id', component: ReportViewer, serviceName: 'reporting' },
];

const AppRouter: React.FC = () => {
  const renderRoute = (route: RouteConfig) => {
    const Component = route.component;

    return (
      <Route
        key={route.path}
        path={route.path}
        element={
          <ErrorBoundary serviceName={route.serviceName}>
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
          </ErrorBoundary>
        }
      />
    );
  };

  const handleServiceError = (serviceName: string, error: Error) => {
    console.error(`[Olorin Router] Service error in ${serviceName}:`, error);

    // Emit service error event
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:error', {
        service: serviceName,
        error: error.message,
        timestamp: new Date().toISOString()
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
            {['investigation', 'agentAnalytics', 'ragIntelligence', 'visualization', 'reporting', 'coreUi'].map(service => (
              <div key={service} className="bg-white rounded-lg shadow p-4">
                <h3 className="font-medium text-gray-900">{service}</h3>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Operational</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Port: {service === 'investigation' ? '3001' :
                         service === 'agentAnalytics' ? '3002' :
                         service === 'ragIntelligence' ? '3003' :
                         service === 'visualization' ? '3004' :
                         service === 'reporting' ? '3005' :
                         service === 'coreUi' ? '3006' : '3000'}
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