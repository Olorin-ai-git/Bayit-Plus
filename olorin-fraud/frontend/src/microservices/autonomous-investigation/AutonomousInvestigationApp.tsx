import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { InvestigationDashboard } from './components/InvestigationDashboard';
import { CreateInvestigation } from './components/CreateInvestigation';
import { InvestigationDetails } from './components/InvestigationDetails';
import { InvestigationList } from './components/InvestigationList';
import { AgentConfiguration } from './components/AgentConfiguration';
import { useInvestigationWorkflow } from './hooks/useInvestigationWorkflow';
import { integrationManager } from './services/integrationManager';
import { environmentConfig } from './config/environment';

// Integration status interface
interface IntegrationStatus {
  eventBus: 'initialized' | 'connected' | 'error' | 'disconnected';
  auth: 'authenticated' | 'unauthenticated' | 'expired' | 'error';
  monitoring: 'enabled' | 'disabled' | 'error';
  overall: 'healthy' | 'degraded' | 'critical' | 'offline';
}

export const AutonomousInvestigationApp: React.FC = () => {
  const navigate = useNavigate();
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [isIntegrationReady, setIsIntegrationReady] = useState(false);

  const {
    investigations,
    isLoading,
    error,
    createInvestigation,
    startInvestigation,
    pauseInvestigation,
    resumeInvestigation,
    stopInvestigation,
    deleteInvestigation,
    refreshInvestigations
  } = useInvestigationWorkflow();

  // Initialize integration services
  useEffect(() => {
    const initializeIntegrations = async () => {
      try {
        // Get user ID from authentication or environment
        const userId = 'current-user-id'; // This would come from auth context

        await integrationManager.initialize({
          userId,
          enableMonitoring: environmentConfig.get('MONITORING_ENABLED'),
          enableEventBus: true,
        });

        setIsIntegrationReady(true);
        console.log('[AutonomousInvestigationApp] Integration services initialized');
      } catch (error) {
        console.error('[AutonomousInvestigationApp] Failed to initialize integrations:', error);
      }
    };

    initializeIntegrations();

    // Subscribe to integration status changes
    const unsubscribe = integrationManager.onStatusChange((status) => {
      setIntegrationStatus(status);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      integrationManager.destroy();
    };
  }, []);

  // Track investigation actions with integration manager
  const handleCreateInvestigation = async (data: any) => {
    const investigation = await createInvestigation(data);
    if (investigation?.id) {
      integrationManager.setInvestigationContext(investigation.id);
      integrationManager.trackInvestigationAction('created', investigation.id);
    }
    return investigation;
  };

  const handleStartInvestigation = async (id: string) => {
    const startTime = Date.now();
    try {
      await startInvestigation(id);
      const duration = Date.now() - startTime;
      integrationManager.trackInvestigationAction('started', id, duration);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      integrationManager.trackInvestigationAction('started', id, duration, error.message);
      throw error;
    }
  };

  const handlePauseInvestigation = async (id: string) => {
    await pauseInvestigation(id);
    integrationManager.trackInvestigationAction('paused', id);
  };

  const handleResumeInvestigation = async (id: string) => {
    await resumeInvestigation(id);
    integrationManager.trackInvestigationAction('resumed', id);
  };

  const handleStopInvestigation = async (id: string) => {
    await stopInvestigation(id);
    integrationManager.trackInvestigationAction('stopped', id);
  };

  const handleDeleteInvestigation = async (id: string) => {
    await deleteInvestigation(id);
    integrationManager.trackInvestigationAction('completed', id);
  };







  // Show integration status while initializing
  if (!isIntegrationReady) {
    return (
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="text-blue-800">
            <h3 className="font-medium">Initializing Services</h3>
            <p className="mt-1 text-sm">Setting up event bus, authentication, and monitoring...</p>
            <div className="mt-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800"></div>
              <span className="ml-2 text-sm">Please wait...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show integration health status if degraded or critical
  if (integrationStatus && (integrationStatus.overall === 'critical' || integrationStatus.overall === 'degraded')) {
    return (
      <div className="p-6">
        <div className={`border rounded-md p-4 ${
          integrationStatus.overall === 'critical'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
        }`}>
          <h3 className="font-medium">
            {integrationStatus.overall === 'critical' ? 'Service Error' : 'Service Degraded'}
          </h3>
          <p className="mt-1 text-sm">
            Integration services are {integrationStatus.overall}. Some features may not work properly.
          </p>
          <div className="mt-2 text-xs">
            <p>Auth: {integrationStatus.auth} | Event Bus: {integrationStatus.eventBus} | Monitoring: {integrationStatus.monitoring}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className={`mt-3 text-sm px-3 py-1 rounded ${
              integrationStatus.overall === 'critical'
                ? 'bg-red-100 hover:bg-red-200'
                : 'bg-yellow-100 hover:bg-yellow-200'
            }`}
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            <h3 className="font-medium">Error</h3>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={refreshInvestigations}
              className="mt-3 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      <Routes>
        <Route
          path="/"
          element={
            <InvestigationDashboard
              investigations={investigations}
              isLoading={isLoading}
              onRefresh={refreshInvestigations}
              onCreateInvestigation={() => navigate('/autonomous/create')}
              onViewInvestigation={(id) => navigate(`/autonomous/${id}`)}
            />
          }
        />
        <Route
          path="/list"
          element={
            <InvestigationList
              investigations={investigations}
              isLoading={isLoading}
              onRefresh={refreshInvestigations}
              onCreateInvestigation={() => navigate('/autonomous/create')}
              onViewInvestigation={(id) => navigate(`/autonomous/${id}`)}
              onDeleteInvestigation={handleDeleteInvestigation}
            />
          }
        />
        <Route
          path="/create"
          element={
            <CreateInvestigation
              onCreateInvestigation={handleCreateInvestigation}
              onCancel={() => navigate('/autonomous')}
            />
          }
        />
        <Route
          path="/agents"
          element={
            <AgentConfiguration
              onSave={() => navigate('/autonomous')}
              onCancel={() => navigate('/autonomous')}
            />
          }
        />
        <Route
          path="/:id"
          element={
            <InvestigationDetails
              investigations={investigations}
              onStartInvestigation={handleStartInvestigation}
              onPauseInvestigation={handlePauseInvestigation}
              onResumeInvestigation={handleResumeInvestigation}
              onStopInvestigation={handleStopInvestigation}
              onDeleteInvestigation={handleDeleteInvestigation}
              onBack={() => navigate('/autonomous')}
            />
          }
        />
      </Routes>
    </div>
  );
};

export default AutonomousInvestigationApp;