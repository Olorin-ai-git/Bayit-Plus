/**
 * InvestigationReportsList Component
 * Feature: 001-extensive-investigation-report
 * Task: T064
 *
 * Main component for browsing investigation reports with:
 * - Paginated list of reports
 * - Loading and error states
 * - Empty state when no reports
 * - Click to view report in new tab
 */

import React, { useState, useEffect } from 'react';
import { InvestigationReportListResponse, RiskLevel } from '../../types/reports';
import InvestigationReportListItem from './InvestigationReportListItem';

interface InvestigationReportsListProps {
  investigationId?: string;
  riskLevel?: RiskLevel;
  search?: string;
  initialPage?: number;
  initialLimit?: number;
}

/**
 * Fetches investigation reports from backend API.
 */
async function fetchReports(params: {
  page: number;
  limit: number;
  investigationId?: string;
  riskLevel?: RiskLevel;
  search?: string;
}): Promise<InvestigationReportListResponse> {
  const apiBaseUrl = (() => {
    const url = process.env.REACT_APP_API_BASE_URL;
    if (!url) throw new Error('REACT_APP_API_BASE_URL must be set');
    return url;
  })();
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString()
  });

  if (params.investigationId) {
    queryParams.append('investigation_id', params.investigationId);
  }
  if (params.riskLevel) {
    queryParams.append('risk_level', params.riskLevel);
  }
  if (params.search) {
    queryParams.append('search', params.search);
  }

  const response = await fetch(
    `${apiBaseUrl}/api/v1/reports/investigation/?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch reports: ${response.statusText}`);
  }

  return response.json();
}

export const InvestigationReportsList: React.FC<InvestigationReportsListProps> = ({
  investigationId,
  riskLevel,
  search,
  initialPage = 1,
  initialLimit = 20
}) => {
  const [reports, setReports] = useState<InvestigationReportListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const loadReports = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchReports({
        page: currentPage,
        limit: initialLimit,
        investigationId,
        riskLevel,
        search
      });
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      setReports(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [currentPage, investigationId, riskLevel, search]);

  const handleViewReport = (invId: string) => {
    const apiBaseUrl = (() => {
    const url = process.env.REACT_APP_API_BASE_URL;
    if (!url) throw new Error('REACT_APP_API_BASE_URL must be set');
    return url;
  })();
    const reportUrl = `${apiBaseUrl}/api/v1/reports/investigation/${invId}/html`;
    window.open(reportUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (reports && currentPage < Math.ceil(reports.total / reports.limit)) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading reports...</span>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500 rounded-lg p-4">
        <div className="flex items-center">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-800 dark:text-red-300 font-medium">Error loading reports</p>
        </div>
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>
        <button
          onClick={loadReports}
          className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty State
  if (!reports || reports.reports.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No reports found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Generate investigation reports to see them listed here.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(reports.total / reports.limit);

  return (
    <div className="space-y-4">
      {/* Reports Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {reports.reports.length} of {reports.total} reports
        </p>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {reports.reports.map((report) => (
          <InvestigationReportListItem
            key={report.investigation_id}
            report={report}
            onView={handleViewReport}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            Previous
          </button>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default InvestigationReportsList;
