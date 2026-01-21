/**
 * Parallel Investigations Page
 * Feature: 001-startup-analysis-flow, 025-financial-analysis-frontend
 *
 * Dashboard for tracking parallel automated investigations with financial metrics.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table } from '@shared/components/Table';
import SectionSkeleton from '@shared/components/SectionSkeleton';
import { WizardButton } from '@shared/components/WizardButton';
import { useToast } from '@shared/components/ui/ToastProvider';
import { investigationService } from '../services/investigationService';
import { createBaseColumns, type ParallelInvestigationRow, InvestigationFilters, CancelInvestigationModal, ReportSuccessModal } from '../components/parallel';
import { getFinancialColumns, getConfusionColumns, FinancialSummaryPanel } from '../components/financial';
import { useFinancialSummary } from '../hooks/useFinancialSummary';
import { useInvestigationsWithFinancials } from '../hooks/useInvestigationsWithFinancials';
import { isFinancialAnalysisEnabled } from '../config/financialConfig';
import { useParallelInvestigationsData } from '../hooks/useParallelInvestigationsData';

export const ParallelInvestigationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [triggering, setTriggering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [investigationToCancel, setInvestigationToCancel] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryReportUrl, setSummaryReportUrl] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const { investigations, loading, error, lastRefreshed, refetch } = useParallelInvestigationsData();
  const statusMap = useMemo(() => Object.fromEntries(investigations.map((inv) => [inv.id, inv.status])), [investigations]);
  const investigationIds = useMemo(() => investigations.map((inv) => inv.id), [investigations]);
  const completedIds = useMemo(() => investigations.filter((inv) => inv.status === 'COMPLETED').map((inv) => inv.id), [investigations]);

  const { financialDataMap } = useInvestigationsWithFinancials(investigationIds, statusMap);
  const { summary: financialSummary, loading: summaryLoading, error: summaryError } = useFinancialSummary(completedIds);

  const investigationsWithFinancials = useMemo(() => {
    return investigations.map((inv) => ({
      ...inv,
      financialMetrics: financialDataMap[inv.id]?.revenueMetrics ?? null,
      confusionMetrics: financialDataMap[inv.id]?.confusionMetrics ?? null,
    }));
  }, [investigations, financialDataMap]);

  const filteredInvestigations = useMemo(() => {
    return investigationsWithFinancials.filter((inv) => {
      if (statusFilters.length > 0) {
        if (!statusFilters.includes(inv.status)) return false;
      } else if (inv.status === 'CANCELLED' || inv.restartedToId) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return inv.id.toLowerCase().includes(query) || inv.entityValue.toLowerCase().includes(query) || inv.merchantName.toLowerCase().includes(query);
      }
      return true;
    });
  }, [investigationsWithFinancials, statusFilters, searchQuery]);

  const handleNavigate = useCallback((id: string) => navigate(`/investigation/progress?id=${id}`), [navigate]);
  const handleCancel = useCallback((id: string) => { setInvestigationToCancel(id); setIsCancelModalOpen(true); }, []);
  const handleRestart = useCallback(async (id: string) => { await investigationService.restartInvestigation(id); refetch(); }, [refetch]);
  const handleTogglePause = useCallback(async (id: string, status: string) => {
    if (status === 'IN_PROGRESS') await investigationService.pauseInvestigation(id);
    else await investigationService.resumeInvestigation(id);
    refetch();
  }, [refetch]);

  const confirmCancel = async () => {
    if (!investigationToCancel) return;
    await investigationService.cancelInvestigation(investigationToCancel, 'Cancelled by user');
    refetch();
    setIsCancelModalOpen(false);
    setInvestigationToCancel(null);
  };

  const triggerAnalysis = async () => {
    setTriggering(true);
    await investigationService.triggerStartupAnalysis(3, true);
    setTimeout(() => { refetch(); setTriggering(false); }, 1000);
  };

  const generateReport = async () => {
    setIsGeneratingSummary(true);
    const result = await investigationService.generateStartupAnalysisReport();
    const url = (result as Record<string, string>).downloadUrl || (result as Record<string, string>).download_url;
    if (url) {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '';
      const finalUrl = url.startsWith('/') ? `${apiBaseUrl}${url}` : url;
      setSummaryReportUrl(finalUrl);
      setIsSuccessModalOpen(true);
      setTimeout(() => window.open(finalUrl, '_blank'), 500);
    } else {
      showToast('warning', 'Report Generated', 'No download URL returned.');
    }
    setIsGeneratingSummary(false);
  };

  const baseColumns = useMemo(() => createBaseColumns({ onNavigate: handleNavigate, onCancel: handleCancel, onRestart: handleRestart, onTogglePause: handleTogglePause }), [handleNavigate, handleCancel, handleRestart, handleTogglePause]);
  const financialColumns = useMemo(() => isFinancialAnalysisEnabled() ? getFinancialColumns<ParallelInvestigationRow>() : [], []);
  const confusionColumns = useMemo(() => isFinancialAnalysisEnabled() ? getConfusionColumns<ParallelInvestigationRow>() : [], []);
  const columns = useMemo(() => [...baseColumns.slice(0, 7), ...financialColumns, ...confusionColumns, ...baseColumns.slice(7)], [baseColumns, financialColumns, confusionColumns]);

  return (
    <div className="min-h-screen bg-black text-corporate-textPrimary px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-corporate-borderPrimary pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Parallel Investigations</h1>
            <p className="text-corporate-textSecondary">Active Batches: <span className="text-corporate-accentPrimary font-mono">{investigations.length}</span></p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-corporate-textTertiary">Last updated: {lastRefreshed.toLocaleTimeString()}</span>
            <WizardButton variant="primary" onClick={triggerAnalysis} disabled={loading} loading={triggering}>Trigger Analysis</WizardButton>
            <WizardButton variant="secondary" onClick={generateReport} disabled={loading} loading={isGeneratingSummary}>Generate Confusions</WizardButton>
            <WizardButton variant="secondary" onClick={refetch} loading={loading}>Refresh</WizardButton>
          </div>
        </div>
        {isFinancialAnalysisEnabled() && completedIds.length > 0 && (
          <FinancialSummaryPanel summary={financialSummary} loading={summaryLoading} error={summaryError} />
        )}
        <InvestigationFilters searchQuery={searchQuery} onSearchChange={setSearchQuery} statusFilters={statusFilters} onStatusFilterChange={setStatusFilters} />
        {loading && investigations.length === 0 ? (
          <SectionSkeleton rows={5} height="lg" className="mt-8" />
        ) : error ? (
          <div className="bg-corporate-bgSecondary/50 border border-corporate-error/50 rounded-lg p-8 text-center text-corporate-error">
            <p className="text-lg font-semibold">Error Loading Data</p>
            <p className="mt-2 text-sm">{error}</p>
            <WizardButton variant="secondary" className="mt-4" onClick={refetch}>Retry</WizardButton>
          </div>
        ) : investigations.length === 0 ? (
          <div className="bg-corporate-bgSecondary/30 border border-corporate-borderPrimary rounded-lg p-12 text-center">
            <p className="text-corporate-textSecondary text-lg">No parallel investigations found.</p>
          </div>
        ) : (
          <div className="bg-black/40 backdrop-blur border border-corporate-borderPrimary rounded-lg overflow-hidden shadow-xl">
            <Table data={filteredInvestigations} config={{ columns, onRowClick: (row) => handleNavigate(row.id), getRowKey: (row) => row.id, sortable: true, paginated: true, pageSize: 50, emptyMessage: 'No investigations match filters.' }} />
          </div>
        )}
      </div>
      <CancelInvestigationModal isOpen={isCancelModalOpen} investigationId={investigationToCancel} onClose={() => setIsCancelModalOpen(false)} onConfirm={confirmCancel} />
      <ReportSuccessModal isOpen={isSuccessModalOpen} reportUrl={summaryReportUrl} onClose={() => setIsSuccessModalOpen(false)} />
    </div>
  );
};

export default ParallelInvestigationsPage;
