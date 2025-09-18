import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { InvestigationDashboard } from './components/InvestigationDashboard';
import { CreateInvestigation } from './components/CreateInvestigation';
import { InvestigationDetails } from './components/InvestigationDetails';
import { InvestigationList } from './components/InvestigationList';
import { AgentConfiguration } from './components/AgentConfiguration';
import { LoadingSpinner } from '../core-ui/components/LoadingSpinner';
import { useInvestigationWorkflow } from './hooks/useInvestigationWorkflow';
import { Investigation } from './types/investigation';

export const AutonomousInvestigationApp: React.FC = () => {
  const navigate = useNavigate();
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







  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            <h3 className="font-medium">Error</h3>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={loadInvestigations}
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
              onDeleteInvestigation={deleteInvestigation}
            />
          }
        />
        <Route
          path="/create"
          element={
            <CreateInvestigation
              onCreateInvestigation={createInvestigation}
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
              onStartInvestigation={startInvestigation}
              onPauseInvestigation={pauseInvestigation}
              onResumeInvestigation={resumeInvestigation}
              onStopInvestigation={stopInvestigation}
              onDeleteInvestigation={deleteInvestigation}
              onBack={() => navigate('/autonomous')}
            />
          }
        />
      </Routes>
    </div>
  );
};

export default AutonomousInvestigationApp;