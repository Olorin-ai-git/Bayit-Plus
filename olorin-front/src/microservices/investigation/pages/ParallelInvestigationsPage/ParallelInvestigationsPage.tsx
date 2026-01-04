import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvestigationPolling } from './useInvestigationPolling';
import { InvestigationsTable } from './InvestigationsTable';
import { InvestigationFilters } from './InvestigationFilters';
import { ParallelInvestigation } from '../../types/parallelInvestigations';
import { getInvestigationConfig } from '../../config/investigationConfig';
import { eventBusInstance } from '../../../../shared/events/UnifiedEventBus';
import { FlowProgressionPanels } from './FlowProgressionPanels';
import { investigationService } from '../../services/investigationService';
import type { FlowProgressionResponse } from '../../services/investigationService';

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
  const [flow, setFlow] = useState<FlowProgressionResponse | null>(null);
  const [flowLoading, setFlowLoading] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);

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

  const fetchFlowProgression = async () => {
    setFlowLoading(true);
    setFlowError(null);
    try {
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06c5fffe-6ae5-4788-a989-0bf06eb0cb8b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ParallelInvestigationsPage.tsx:71',message:'Calling getFlowProgression',data:{day,year,month},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      const data = await investigationService.instance.getFlowProgression({ day, year, month });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06c5fffe-6ae5-4788-a989-0bf06eb0cb8b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ParallelInvestigationsPage.tsx:75',message:'getFlowProgression response',data:{hasData:!!data,hasDaily:!!data?.daily,hasMonthly:!!data?.monthly,dailyTotal:data?.daily?.total,monthlyTotal:data?.monthly?.total},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      setFlow(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load flow progression';
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06c5fffe-6ae5-4788-a989-0bf06eb0cb8b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ParallelInvestigationsPage.tsx:82',message:'getFlowProgression error',data:{error:msg,stack:e instanceof Error ? e.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      setFlowError(msg);
      setFlow(null);
    } finally {
      setFlowLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowProgression();
  }, []);

  useEffect(() => {
    if (lastUpdated) {
      fetchFlowProgression();
    }
  }, [lastUpdated]);

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

      <FlowProgressionPanels
        daily={flow?.daily ?? null}
        monthly={flow?.monthly ?? null}
        loading={flowLoading}
        error={flowError}
      />

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
