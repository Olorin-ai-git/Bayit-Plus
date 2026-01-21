/**
 * Monthly Analysis Page
 * Feature: monthly-frontend-trigger
 *
 * Main page for triggering and monitoring monthly analysis runs.
 * Tab layout: Current Run | History | Reports
 *
 * SYSTEM MANDATE Compliance:
 * - Tailwind CSS only
 * - No hardcoded values
 */

import React, { useState, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@shared/components/ui/tabs';
import { useMonthlyAnalysisStatus } from '../hooks/useMonthlyAnalysisStatus';
import { useMonthlyAnalysisHistory } from '../hooks/useMonthlyAnalysisHistory';
import { monthlyAnalysisService } from '../services/monthlyAnalysisService';
import {
  MonthlyAnalysisTriggerParams,
  MonthlyAnalysisResults as ResultsType,
} from '../types/monthlyAnalysis';
import { MonthlyAnalysisConfigForm } from '../components/monthly/MonthlyAnalysisConfigForm';
import { MonthlyAnalysisStatusCard } from '../components/monthly/MonthlyAnalysisStatusCard';
import { MonthlyAnalysisProgress } from '../components/monthly/MonthlyAnalysisProgress';
import { MonthlyAnalysisHistory } from '../components/monthly/MonthlyAnalysisHistory';
import { MonthlyAnalysisResultsDisplay } from '../components/monthly/MonthlyAnalysisResults';
import { ReportDownloads } from '../components/monthly/ReportDownloads';

export const MonthlyAnalysisPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('current');
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [results, setResults] = useState<ResultsType | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  const { status, isPolling, error: statusError, refresh: refreshStatus } = useMonthlyAnalysisStatus();
  const {
    runs, total, page, pageSize, hasMore, isLoading: historyLoading,
    nextPage, previousPage, setStatusFilter, statusFilter, refresh: refreshHistory,
  } = useMonthlyAnalysisHistory();

  const handleTrigger = useCallback(async (params: MonthlyAnalysisTriggerParams) => {
    setTriggerError(null);
    setIsTriggering(true);
    try {
      await monthlyAnalysisService.triggerAnalysis(params);
      refreshStatus();
      setActiveTab('current');
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : 'Failed to trigger analysis');
    } finally {
      setIsTriggering(false);
    }
  }, [refreshStatus]);

  const handleCancel = useCallback(async (runId: string) => {
    setIsCancelling(true);
    try {
      await monthlyAnalysisService.cancelRun(runId);
      refreshStatus();
    } catch (err) {
      console.error('Failed to cancel run:', err);
    } finally {
      setIsCancelling(false);
    }
  }, [refreshStatus]);

  const handleViewRun = useCallback(async (runId: string) => {
    setSelectedRunId(runId);
    setIsLoadingResults(true);
    try {
      const resultsData = await monthlyAnalysisService.getResults(runId);
      setResults(resultsData);
      setActiveTab('reports');
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setIsLoadingResults(false);
    }
  }, []);

  const handleDownloadReport = useCallback(async (reportType: string) => {
    if (!selectedRunId) return;
    const url = monthlyAnalysisService.getReportDownloadUrl(selectedRunId, reportType);
    window.open(url, '_blank');
  }, [selectedRunId]);

  const currentYear = status?.year || new Date().getFullYear();
  const currentMonth = status?.month || new Date().getMonth() + 1;

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white">Monthly Analysis</h1>
          <p className="text-gray-400 mt-1">
            Trigger and monitor monthly investigation analysis runs
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-lg p-1">
            <TabsTrigger value="current">Current Run</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-6">
            <MonthlyAnalysisConfigForm
              onSubmit={handleTrigger}
              isSubmitting={isTriggering}
              error={triggerError}
              isRunning={status?.status === 'running'}
            />
            {statusError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{statusError.message}</p>
              </div>
            )}
            {status && (
              <>
                <MonthlyAnalysisStatusCard
                  status={status}
                  onCancel={handleCancel}
                  isCancelling={isCancelling}
                  onViewResults={handleViewRun}
                />
                {status.status === 'running' && status.progress && (
                  <MonthlyAnalysisProgress
                    year={currentYear}
                    month={currentMonth}
                    currentDay={status.progress.currentDay}
                    daysCompleted={status.progress.daysCompleted}
                    totalDays={status.progress.totalDays}
                    dailyResults={status.progress.dailyResults}
                    isRunning
                  />
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="history">
            <MonthlyAnalysisHistory
              runs={runs}
              total={total}
              page={page}
              pageSize={pageSize}
              hasMore={hasMore}
              isLoading={historyLoading}
              onViewRun={handleViewRun}
              onNextPage={nextPage}
              onPreviousPage={previousPage}
              onFilterChange={setStatusFilter}
              currentFilter={statusFilter}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {isLoadingResults ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-purple-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : results ? (
              <>
                <MonthlyAnalysisResultsDisplay
                  results={results}
                  onDownloadReport={handleDownloadReport}
                />
                <ReportDownloads
                  reports={results.reports || []}
                  onDownload={(url, filename) => window.open(url, '_blank')}
                />
              </>
            ) : (
              <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
                <p className="text-gray-400">Select a completed run from History to view results</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MonthlyAnalysisPage;
