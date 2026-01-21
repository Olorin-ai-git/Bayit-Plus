/**
 * WizardStateDisplay Component.
 * Feature: 005-polling-and-persistence
 *
 * Displays wizard state with real-time updates from polling.
 * Shows current step, status, progress, and sync indicators.
 */
import React, { useEffect } from 'react';
import { useWizardPolling } from '../hooks/useWizardPolling';
import { useWizardStore } from '../store/wizardStore';
import { WizardStep, InvestigationStatus } from '../types/wizardState';

interface WizardStateDisplayProps {
  investigationId: string;
}

const stepLabels: Record<WizardStep, string> = {
  [WizardStep.SETTINGS]: 'Settings',
  [WizardStep.PROGRESS]: 'In Progress',
  [WizardStep.RESULTS]: 'Results'
};

const statusColors: Record<InvestigationStatus, string> = {
  [InvestigationStatus.IN_PROGRESS]: 'bg-blue-500',
  [InvestigationStatus.COMPLETED]: 'bg-green-500',
  [InvestigationStatus.ERROR]: 'bg-red-500',
  [InvestigationStatus.CANCELLED]: 'bg-gray-500'
};

export const WizardStateDisplay: React.FC<WizardStateDisplayProps> = ({ investigationId }) => {
  const { wizardState, localChanges, isLoading, isSyncing } = useWizardStore();
  const { isPolling, currentInterval, retryCount, error: pollingError, startPolling, stopPolling } = useWizardPolling(investigationId);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [investigationId, startPolling, stopPolling]);

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg p-4">
        <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      </div>
    );
  }

  if (!wizardState) {
    return <div className="text-gray-500">No wizard state found.</div>;
  }

  const syncIndicator = () => {
    if (pollingError) return <span className="inline-block w-3 h-3 rounded-full bg-red-500" title="Sync error"></span>;
    if (localChanges) return <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" title="Local changes pending"></span>;
    if (isPolling && !isSyncing) return <span className="inline-block w-3 h-3 rounded-full bg-green-500" title="Synced"></span>;
    return <span className="inline-block w-3 h-3 rounded-full bg-gray-400" title="Not polling"></span>;
  };

  const lastUpdated = wizardState.updated_at ? new Date(wizardState.updated_at).toLocaleTimeString() : 'N/A';

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">Investigation Status</h3>
        {syncIndicator()}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Step:</span>
          <span className="text-sm font-medium text-gray-900">{stepLabels[wizardState.wizard_step]}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          <span className={`px-2 py-1 rounded text-xs text-white ${statusColors[wizardState.status]}`}>
            {wizardState.status}
          </span>
        </div>

        {wizardState.wizard_step === WizardStep.PROGRESS && wizardState.progress_json && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Progress:</span>
              <span className="text-sm font-medium text-gray-900">{wizardState.progress_json.percent_complete}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${wizardState.progress_json.percent_complete}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <span>Last updated: {lastUpdated}</span>
          {isPolling && <span>Polling: {currentInterval}ms</span>}
          {retryCount > 0 && <span className="text-red-500">Retries: {retryCount}</span>}
        </div>
      </div>
    </div>
  );
};
