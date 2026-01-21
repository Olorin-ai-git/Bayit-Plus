/**
 * Report Downloads Component
 * Feature: monthly-frontend-trigger
 *
 * Displays available reports for download from a monthly analysis run.
 *
 * SYSTEM MANDATE Compliance:
 * - Tailwind CSS only
 * - No hardcoded values
 */

import React from 'react';
import { ReportLink } from '../../types/monthlyAnalysis';

export interface ReportDownloadsProps {
  /** Available reports */
  reports: ReportLink[];
  /** Whether loading reports list */
  isLoading?: boolean;
  /** Error loading reports */
  error?: Error | null;
  /** Callback when download is clicked */
  onDownload?: (url: string, filename: string) => void;
}

/**
 * Get icon for report type
 */
function getReportIcon(reportType: string): React.ReactNode {
  switch (reportType.toLowerCase()) {
    case 'html':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'csv':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case 'pdf':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      );
  }
}

/**
 * Format file size
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get report type display name
 */
function getReportTypeName(reportType: string): string {
  switch (reportType.toLowerCase()) {
    case 'html':
      return 'HTML Report';
    case 'csv':
      return 'CSV Export';
    case 'pdf':
      return 'PDF Report';
    default:
      return reportType.toUpperCase();
  }
}

/**
 * Report downloads component
 */
export const ReportDownloads: React.FC<ReportDownloadsProps> = ({
  reports,
  isLoading = false,
  error = null,
  onDownload,
}) => {
  const handleDownload = (report: ReportLink) => {
    if (onDownload) {
      onDownload(report.url, report.filename);
    } else {
      // Default: open in new tab
      window.open(report.url, '_blank');
    }
  };

  return (
    <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Available Reports</h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin h-6 w-6 text-purple-400" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error.message}</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 mx-auto text-gray-500 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-400">No reports available yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Reports are generated when the analysis completes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, index) => (
            <div
              key={`${report.reportType}-${index}`}
              className="flex items-center justify-between p-4 bg-black/20 rounded-lg
                         hover:bg-black/30 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/5 rounded-lg text-purple-400 group-hover:text-purple-300">
                  {getReportIcon(report.reportType)}
                </div>
                <div>
                  <p className="font-medium text-white">
                    {getReportTypeName(report.reportType)}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{report.filename}</span>
                    {report.sizeBytes && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(report.sizeBytes)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDownload(report)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30
                           text-purple-400 rounded-lg transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Generation timestamp */}
      {reports.length > 0 && (
        <p className="mt-4 text-xs text-gray-500">
          Generated: {new Date(reports[0].generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default ReportDownloads;
