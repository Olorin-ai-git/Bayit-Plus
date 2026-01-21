/**
 * InvestigationReportsTab Component
 * Feature: 001-extensive-investigation-report
 * Task: T067
 *
 * Tab component for browsing investigation reports in the Reports Microservice.
 * Provides a standalone view that can be integrated into tab navigation.
 */

import React, { useState } from 'react';
import InvestigationReportsList from './InvestigationReportsList';
import type { RiskLevel } from '../../types/reports';

export const InvestigationReportsTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel | undefined>(undefined);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Investigation Reports
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Browse and view all generated investigation reports with comprehensive analysis and findings.
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <label htmlFor="search-reports" className="sr-only">
            Search reports
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="search"
              id="search-reports"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search by investigation ID, entity ID, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Risk Level Filter */}
        <div className="w-full sm:w-48">
          <label htmlFor="risk-level-filter" className="sr-only">
            Filter by risk level
          </label>
          <select
            id="risk-level-filter"
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={selectedRiskLevel || ''}
            onChange={(e) =>
              setSelectedRiskLevel(e.target.value ? (e.target.value as RiskLevel) : undefined)
            }
          >
            <option value="">All Risk Levels</option>
            <option value="critical">Critical (80-100)</option>
            <option value="high">High (60-79)</option>
            <option value="medium">Medium (40-59)</option>
            <option value="low">Low (0-39)</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <InvestigationReportsList
        search={searchQuery || undefined}
        riskLevel={selectedRiskLevel}
        initialLimit={20}
      />
    </div>
  );
};

export default InvestigationReportsTab;
