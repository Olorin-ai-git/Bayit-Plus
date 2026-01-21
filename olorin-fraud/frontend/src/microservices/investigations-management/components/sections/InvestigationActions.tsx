/**
 * Investigation Actions Component
 *
 * Action buttons for investigation operations: Replay, Delete, Generate Report, Analytics, Close.
 * Handles report generation and detector creation with loading states.
 */

import React, { useState } from 'react';
import { Investigation } from '../../types/investigations';
import { useInvestigationReports } from '@microservices/reporting/hooks/useInvestigationReports';
import { Spinner } from '@shared/components/ui/Spinner';
import { useToast } from '@shared/components/ui/ToastProvider';

interface InvestigationActionsProps {
  investigation: Investigation;
  onClose: () => void;
  onDelete?: (investigation: Investigation) => void;
  onReplay?: (investigation: Investigation) => void;
}

export const InvestigationActions: React.FC<InvestigationActionsProps> = ({
  investigation,
  onClose,
  onDelete,
  onReplay,
}) => {
  const { generateReport, isGenerating, error: reportError } = useInvestigationReports();
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [isCreatingDetector, setIsCreatingDetector] = useState(false);
  const { showToast } = useToast();

  const handleGenerateReport = async () => {
    setReportSuccess(null);

    if (investigation.status !== 'completed' && investigation.status !== 'COMPLETED') {
      setReportSuccess('Cannot generate report: Investigation must be completed first.');
      return;
    }

    const result = await generateReport({
      investigation_id: investigation.id,
      title: `Investigation Report - ${investigation.name || investigation.id}`,
    });

    if (result) {
      setReportSuccess(
        `Report generated successfully! File size: ${(result.file_size_bytes / 1024 / 1024).toFixed(2)} MB`
      );
    }
  };

  const handleViewReport = () => {
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
    if (!apiBaseUrl) {
      throw new Error('REACT_APP_API_BASE_URL environment variable is required');
    }
    const reportUrl = `${apiBaseUrl}/api/v1/reports/investigation/${investigation.id}/html`;
    window.open(reportUrl, '_blank');
  };

  const handleCreateDetector = async () => {
    setIsCreatingDetector(true);
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
      if (!apiBaseUrl) {
        throw new Error('REACT_APP_API_BASE_URL environment variable is required');
      }
      const response = await fetch(
        `${apiBaseUrl}/api/v1/analytics/investigations/${investigation.id}/create-detector`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create detector' }));
        throw new Error(error.detail || 'Failed to create detector');
      }

      const result = await response.json();
      showToast(
        'success',
        'Detector Created',
        `Detector "${result.detector.name}" created successfully. Running preview...`
      );

      const detectorUrl = `/analytics/detectors/${result.detector.id}?autoRun=true`;
      if (window.olorin?.navigate) {
        window.olorin.navigate(detectorUrl);
      } else {
        window.location.href = detectorUrl;
      }
    } catch (error) {
      showToast(
        'error',
        'Failed to Create Detector',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsCreatingDetector(false);
    }
  };

  return (
    <>
      {/* Top Action Buttons (Replay, Delete) */}
      {(onReplay || onDelete) && (
        <div className="flex gap-2 flex-wrap pb-4 border-b border-corporate-borderPrimary/40">
          {onReplay && (
            <button
              onClick={() => onReplay(investigation)}
              className="px-4 py-2 rounded-lg bg-corporate-bgSecondary border border-corporate-borderPrimary/40 hover:border-corporate-accentSecondary text-corporate-textSecondary hover:text-corporate-accentSecondary transition-all duration-200 text-sm font-medium"
            >
              Replay
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(investigation)}
              className="px-4 py-2 rounded-lg bg-corporate-bgSecondary border border-corporate-error/40 hover:border-corporate-error text-corporate-error hover:bg-corporate-error/10 transition-all duration-200 text-sm font-medium"
            >
              Delete
            </button>
          )}
        </div>
      )}

      {/* Success/Error Messages */}
      {reportSuccess && (
        <div className="p-3 bg-green-900/20 border border-green-500 text-green-300 rounded-lg flex items-center justify-between">
          <span>{reportSuccess}</span>
          <button
            onClick={handleViewReport}
            className="ml-3 px-3 py-1 rounded bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition-all duration-200"
          >
            View Report
          </button>
        </div>
      )}
      {reportError && (
        <div className="p-3 bg-red-900/20 border border-red-500 text-red-300 rounded-lg">
          {reportError}
        </div>
      )}

      {/* Bottom Action Buttons (Generate Report, Analytics, Close) */}
      <div className="flex justify-end gap-3 pt-4 border-t border-corporate-borderPrimary">
        <button
          onClick={handleGenerateReport}
          disabled={
            isGenerating ||
            (investigation.status !== 'completed' && investigation.status !== 'COMPLETED')
          }
          className="px-4 py-2 rounded-lg bg-corporate-accentSecondary hover:bg-corporate-accentSecondaryHover text-white font-medium transition-all duration-200 shadow-lg hover:shadow-corporate-accentSecondary/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          title={
            investigation.status !== 'completed' && investigation.status !== 'COMPLETED'
              ? 'Investigation must be completed first'
              : ''
          }
        >
          {isGenerating && <Spinner size="sm" variant="white" />}
          {isGenerating ? 'Generating Report...' : 'Generate Report'}
        </button>
        <button
          onClick={handleCreateDetector}
          disabled={isCreatingDetector}
          className="px-4 py-2 rounded-lg bg-corporate-info hover:bg-corporate-info/90 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-corporate-info/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
        >
          {isCreatingDetector && <Spinner size="sm" variant="white" />}
          {isCreatingDetector ? 'Creating Detector...' : 'Analytics'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white font-medium transition-all duration-200 shadow-lg hover:shadow-corporate-accentPrimary/50 hover:scale-105 active:scale-95"
        >
          Close
        </button>
      </div>
    </>
  );
};
