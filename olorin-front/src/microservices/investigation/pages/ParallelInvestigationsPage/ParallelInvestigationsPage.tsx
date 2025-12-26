import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvestigationPolling } from './useInvestigationPolling';
import { InvestigationsTable } from './InvestigationsTable';
import { InvestigationFilters } from './InvestigationFilters';
import { ParallelInvestigation } from '../../types/parallelInvestigations';
import { getInvestigationConfig } from '../../config/investigationConfig';
import { eventBusInstance } from '../../../../shared/events/UnifiedEventBus';

export function ParallelInvestigationsPage() {
  const navigate = useNavigate();
  const config = getInvestigationConfig();
  const {
    investigations,
    loading,
    error,
    refetch,
    lastUpdated,
    selectedStatus,
    setSelectedStatus,
    retryWithBackoff,
  } = useInvestigationPolling();
  const [wsConnected, setWsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleWsConnected = () => setWsConnected(true);
    const handleWsDisconnected = () => setWsConnected(false);

    eventBusInstance.on('system:websocket-connected', handleWsConnected);
    eventBusInstance.on('system:websocket-disconnected', handleWsDisconnected);

    return () => {
      eventBusInstance.off('system:websocket-connected', handleWsConnected);
      eventBusInstance.off('system:websocket-disconnected', handleWsDisconnected);
    };
  }, []);

  const handleRowClick = (investigation: ParallelInvestigation) => {
    navigate(`/investigation/progress?id=${investigation.investigationId || investigation.id}`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRetry = async () => {
    await retryWithBackoff();
  };

  const getReportUrls = () => {
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    return {
      daily: `${apiBaseUrl}/api/v1/reports/artifacts/startup_analysis_DAILY_${dateStr}.html`,
      monthly: `${apiBaseUrl}/api/v1/reports/artifacts/startup_analysis_MONTHLY_${year}_${month}.html`
    };
  };

  const reportUrls = getReportUrls();

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Running Investigations</h1>
            <p className="text-gray-600">Monitor parallel running investigations in real-time</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-xs text-gray-600">
                {wsConnected ? 'Real-time' : 'Polling mode'}
              </span>
            </div>
            <div className="flex gap-2">
              <a 
                href={reportUrls.daily}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors"
              >
                Daily Flow Report
              </a>
              <a 
                href={reportUrls.monthly}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors"
              >
                Monthly Flow Report
              </a>
            </div>
          </div>
        </div>

        {config.enableStatusFilter && (
          <div className="mb-4">
            <InvestigationFilters
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-red-900">Error loading investigations</h3>
              <p className="text-sm text-red-700 mt-1">{error.message}</p>
            </div>
            <button
              onClick={handleRetry}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium whitespace-nowrap"
            >
              Retry with Backoff
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Showing {investigations.length} investigation{investigations.length !== 1 ? 's' : ''}</span>
            <span className="text-gray-400">•</span>
            <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium transition-all"
          >
            {isRefreshing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Refreshing...
              </span>
            ) : (
              'Refresh'
            )}
          </button>
        </div>

        <InvestigationsTable
          investigations={investigations}
          loading={loading}
          error={error && !error.message.includes('Max retries')}
          onRowClick={handleRowClick}
        />
      </div>
    </div>
  );
}

export { ParallelInvestigationsPage };
