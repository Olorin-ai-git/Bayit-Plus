import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ServiceFactory, createServiceConfig, useServices } from './services/';
import { InvestigationDashboard } from './components/InvestigationDashboard';
import { StepExecutor } from './components/StepExecutor';
import { ReportGenerator } from './components/ReportGenerator';
import { InvestigationCollaboration } from './components/InvestigationCollaboration';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import ErrorAlert from '../../shared/components/ErrorAlert';

// Service context for dependency injection
const ServiceContext = React.createContext<ServiceFactory | null>(null);

export const useServiceFactory = () => {
  const context = React.useContext(ServiceContext);
  if (!context) {
    throw new Error('useServiceFactory must be used within a ServiceProvider');
  }
  return context;
};


interface ManualInvestigationAppProps {
  className?: string;
  config?: {
    apiBaseUrl?: string;
    websocketUrl?: string;
    debugMode?: boolean;
  };
}

export const ManualInvestigationApp: React.FC<ManualInvestigationAppProps> = ({
  className = '',
  config = {}
}) => {
  const [serviceFactory, setServiceFactory] = useState<ServiceFactory | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      setError(null);
      setConnectionStatus('connecting');

      // Create service configuration
      const serviceConfig = createServiceConfig({
        api_base_url: config.apiBaseUrl || process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090',
        websocket_url: config.websocketUrl || process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8090/ws',
        debug_mode: config.debugMode ?? (process.env.NODE_ENV === 'development'),
        enable_real_time: true,
        timeout_ms: 30000,
        retry_attempts: 3
      });

      // Initialize service factory
      const factory = new ServiceFactory(serviceConfig);
      setServiceFactory(factory);

      // Test WebSocket connection
      const wsService = factory.getWebSocketService();
      await wsService.connect();

      setConnectionStatus('connected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize services');
      setConnectionStatus('error');
    }
  };

  const handleRetryConnection = () => {
    initializeServices();
  };

  if (connectionStatus === 'connecting') {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-gray-600">
            Connecting to Manual Investigation Service...
          </p>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'error' || !serviceFactory) {
    return (
      <div className={`p-6 ${className}`}>
        <ErrorAlert
          message={error || 'Failed to connect to Manual Investigation Service'}
          onRetry={handleRetryConnection}
        />
      </div>
    );
  }

  return (
    <ServiceContext.Provider value={serviceFactory}>
      <div className={`manual-investigation-app min-h-screen bg-gray-50 ${className}`}>
        <div className="container mx-auto px-4 py-6">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Manual Investigation
            </h1>
            <p className="text-gray-600 mt-1">
              Expert-guided investigation tools and workflows
            </p>
          </header>

          <main>
            <Routes>
              {/* Main dashboard route */}
              <Route path="/" element={<InvestigationDashboard />} />
              <Route path="/investigations" element={<InvestigationDashboard />} />
              <Route path="/investigations/*" element={<InvestigationDashboard />} />

              {/* Investigation detail routes */}
              <Route
                path="/investigation/:id"
                element={<InvestigationDetailView />}
              />

              {/* Step execution route */}
              <Route
                path="/investigation/:investigationId/step/:stepId"
                element={<StepExecutionView />}
              />

              {/* Report generation route */}
              <Route
                path="/investigation/:investigationId/report"
                element={<ReportGenerationView />}
              />

              {/* Collaboration route */}
              <Route
                path="/investigation/:investigationId/collaboration"
                element={<CollaborationView />}
              />

              {/* Catch-all route for investigation paths */}
              <Route path="*" element={<InvestigationDashboard />} />
            </Routes>
          </main>
        </div>
      </div>
    </ServiceContext.Provider>
  );
};

// Route component implementations
const InvestigationDetailView: React.FC = () => {
  const { id: investigationId } = useParams<{ id: string }>();

  if (!investigationId) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <InvestigationDashboard />
      <InvestigationCollaboration investigationId={investigationId} />
    </div>
  );
};

const StepExecutionView: React.FC = () => {
  const { investigationId, stepId } = useParams<{ investigationId: string; stepId: string }>();
  const { investigation: investigationService } = useServices();
  const [step, setStep] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (stepId) {
      loadStep();
    }
  }, [stepId]);

  const loadStep = async () => {
    try {
      const response = await fetch(`/api/steps/${stepId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const stepData = await response.json();
      setStep(stepData);
    } catch (error) {
      console.error('Failed to load step:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!investigationId || !stepId) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (!step) {
    return <ErrorAlert message="Step not found" />;
  }

  return (
    <div className="space-y-6">
      <StepExecutor
        step={step}
        onStepUpdate={setStep}
        onExecutionComplete={(updatedStep) => {
          setStep(updatedStep);
          // Navigate back to investigation or next step
        }}
      />
    </div>
  );
};

const ReportGenerationView: React.FC = () => {
  const { investigationId } = useParams<{ investigationId: string }>();

  if (!investigationId) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <ReportGenerator
        investigationId={investigationId}
        onReportGenerated={(report) => {
          // Handle successful report generation
          console.log('Report generated:', report);
        }}
      />
    </div>
  );
};

const CollaborationView: React.FC = () => {
  const { investigationId } = useParams<{ investigationId: string }>();

  if (!investigationId) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <InvestigationCollaboration investigationId={investigationId} />
    </div>
  );
};

// Default export for Module Federation
export default ManualInvestigationApp;