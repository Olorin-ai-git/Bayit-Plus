/**
 * InvestigationReportListItem Component
 * Feature: 001-extensive-investigation-report
 * Task: T065
 *
 * Card component displaying investigation report metadata with:
 * - Report title and investigation ID
 * - Risk score badge
 * - Entity information
 * - Generation timestamp
 * - File size
 * - Click to view report in new tab
 */

import React from 'react';
import { InvestigationReportListItem as ReportItem } from '../../types/reports';
import RiskScoreBadge from './RiskScoreBadge';

interface InvestigationReportListItemProps {
  report: ReportItem;
  onView: (investigationId: string) => void;
}

/**
 * Formats file size in human-readable format.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Formats ISO datetime to relative time or readable format.
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    return hours === 0 ? 'Just now' : `${hours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Truncates text to specified length with ellipsis.
 */
function truncate(text: string | null, maxLength: number): string {
  if (!text) return 'N/A';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export const InvestigationReportListItem: React.FC<InvestigationReportListItemProps> = ({
  report,
  onView
}) => {
  const handleClick = () => {
    onView(report.investigation_id);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onView(report.investigation_id);
    }
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 cursor-pointer"
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role="button"
      tabIndex={0}
      aria-label={`View report for investigation ${report.title || report.investigation_id}`}
    >
      {/* Header: Title and Risk Score */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {report.title || `Investigation ${report.investigation_id.substring(0, 8)}`}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
            {report.investigation_id}
          </p>
        </div>
        <div className="flex-shrink-0">
          <RiskScoreBadge score={report.overall_risk_score} />
        </div>
      </div>

      {/* Entity Information */}
      {(report.entity_id || report.entity_type) && (
        <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Entity:</span>
            <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">
              {truncate(report.entity_id, 40)}
            </span>
            {report.entity_type && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                {report.entity_type}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer: Metadata */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {formatDateTime(report.generated_at)}
          </span>
          <span className="flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {formatFileSize(report.file_size_bytes)}
          </span>
        </div>

        {/* Status and Owner */}
        <div className="flex items-center space-x-2">
          {report.status && (
            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded">
              {report.status}
            </span>
          )}
          {report.owner && (
            <span className="text-xs text-gray-500 dark:text-gray-500">
              by {truncate(report.owner, 20)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestigationReportListItem;
