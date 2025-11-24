/**
 * Investigation Summary Component
 * Feature: 004-new-olorin-frontend
 *
 * Displays high-level summary of investigation results.
 * Uses Olorin purple styling with key metrics and risk overview.
 */

import React from 'react';
import {
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { RiskGauge } from '@microservices/visualization';

export interface InvestigationSummaryProps {
  overallRiskScore: number;
  entitiesInvestigated: number;
  findingsCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  duration: string;
  completedAt: string;
  className?: string;
}

/**
 * Investigation summary with key metrics
 */
export const InvestigationSummary: React.FC<InvestigationSummaryProps> = ({
  overallRiskScore,
  entitiesInvestigated,
  findingsCount,
  duration,
  completedAt,
  className = ''
}) => {
  const totalFindings =
    findingsCount.critical + findingsCount.high + findingsCount.medium + findingsCount.low;

  return (
    <div
      className={`bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-corporate-textPrimary">Investigation Summary</h2>
        <CheckCircleIcon className="w-8 h-8 text-corporate-success" />
      </div>

      {/* Overall Risk Score */}
      <div className="mb-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-corporate-textSecondary mb-3">Overall Risk Score</p>
          <RiskGauge score={overallRiskScore} size="xl" showLabel={true} />
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Entities Investigated */}
        <div className="bg-black/30 backdrop-blur rounded-lg p-4 text-center">
          <UserIcon className="w-6 h-6 text-corporate-accentPrimary mx-auto mb-2" />
          <p className="text-2xl font-bold text-corporate-textPrimary">{entitiesInvestigated}</p>
          <p className="text-xs text-corporate-textSecondary mt-1">
            {entitiesInvestigated === 1 ? 'Entity' : 'Entities'}
          </p>
        </div>

        {/* Total Findings */}
        <div className="bg-black/30 backdrop-blur rounded-lg p-4 text-center">
          <ExclamationTriangleIcon className="w-6 h-6 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-corporate-textPrimary">{totalFindings}</p>
          <p className="text-xs text-corporate-textSecondary mt-1">
            {totalFindings === 1 ? 'Finding' : 'Findings'}
          </p>
        </div>

        {/* Duration */}
        <div className="bg-black/30 backdrop-blur rounded-lg p-4 text-center">
          <ClockIcon className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-corporate-textPrimary">{duration}</p>
          <p className="text-xs text-corporate-textSecondary mt-1">Duration</p>
        </div>

        {/* Status */}
        <div className="bg-black/30 backdrop-blur rounded-lg p-4 text-center">
          <CheckCircleIcon className="w-6 h-6 text-corporate-success mx-auto mb-2" />
          <p className="text-sm font-bold text-corporate-success">Completed</p>
          <p className="text-xs text-corporate-textSecondary mt-1">
            {formatTimestamp(completedAt)}
          </p>
        </div>
      </div>

      {/* Findings Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-corporate-textPrimary mb-3">
          Findings by Severity
        </h3>
        <div className="space-y-2">
          {/* Critical */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-corporate-textSecondary">Critical</span>
            </div>
            <span className="text-sm font-semibold text-corporate-error">{findingsCount.critical}</span>
          </div>

          {/* High */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-corporate-textSecondary">High</span>
            </div>
            <span className="text-sm font-semibold text-amber-400">{findingsCount.high}</span>
          </div>

          {/* Medium */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span className="text-sm text-corporate-textSecondary">Medium</span>
            </div>
            <span className="text-sm font-semibold text-cyan-400">{findingsCount.medium}</span>
          </div>

          {/* Low */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-sm text-corporate-textSecondary">Low</span>
            </div>
            <span className="text-sm font-semibold text-gray-400">{findingsCount.low}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

export default InvestigationSummary;
