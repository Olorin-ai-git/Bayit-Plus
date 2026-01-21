/**
 * Findings List Component
 * Feature: 004-new-olorin-frontend
 *
 * Displays list of investigation findings with severity indicators.
 * Uses Olorin purple styling with filterable severity levels.
 */

import React, { useState } from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  affectedEntities: string[];
  timestamp: string;
}

export interface FindingsListProps {
  findings: Finding[];
  maxHeight?: string;
  showFilters?: boolean;
  className?: string;
}

/**
 * Findings list with severity filtering
 */
export const FindingsList: React.FC<FindingsListProps> = ({
  findings,
  maxHeight = 'max-h-96',
  showFilters = true,
  className = ''
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<Finding['severity'] | 'all'>('all');

  const filteredFindings =
    selectedSeverity === 'all'
      ? findings
      : findings.filter((f) => f.severity === selectedSeverity);

  const severityCounts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length
  };

  if (findings.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <InformationCircleIcon className="w-12 h-12 text-corporate-success mx-auto mb-3" />
        <p className="text-sm text-corporate-success font-medium">No findings detected</p>
        <p className="text-xs text-corporate-textTertiary mt-2">
          Investigation completed successfully with no issues found
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Severity Filters */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedSeverity('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedSeverity === 'all'
                ? 'bg-corporate-accentPrimary text-white'
                : 'bg-black/30 backdrop-blur text-corporate-textSecondary hover:text-corporate-textPrimary'
            }`}
          >
            All ({findings.length})
          </button>
          {(['critical', 'high', 'medium', 'low'] as const).map((severity) => (
            <button
              key={severity}
              onClick={() => setSelectedSeverity(severity)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedSeverity === severity
                  ? getSeverityButtonActive(severity)
                  : 'bg-black/30 backdrop-blur text-corporate-textSecondary hover:text-corporate-textPrimary'
              }`}
            >
              {severity.charAt(0).toUpperCase() + severity.slice(1)} ({severityCounts[severity]})
            </button>
          ))}
        </div>
      )}

      {/* Findings List */}
      <div className={`${maxHeight} overflow-y-auto space-y-3`}>
        {filteredFindings.map((finding) => (
          <div
            key={finding.id}
            className={`bg-black/40 backdrop-blur-md border rounded-lg p-4 ${getSeverityBorder(
              finding.severity
            )}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3 flex-1">
                <ExclamationTriangleIcon
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${getSeverityColor(
                    finding.severity
                  )}`}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-corporate-textPrimary">
                    {finding.title}
                  </h4>
                  <p className="text-xs text-corporate-textTertiary mt-1">{finding.category}</p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-3 ${getSeverityBadge(
                  finding.severity
                )}`}
              >
                {finding.severity}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-corporate-textSecondary mb-3">{finding.description}</p>

            {/* Affected Entities */}
            {finding.affectedEntities.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-corporate-textTertiary mb-1">
                  Affected Entities:
                </p>
                <div className="flex flex-wrap gap-1">
                  {finding.affectedEntities.map((entity, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-black/30 backdrop-blur rounded text-xs text-corporate-textSecondary"
                    >
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamp */}
            <p className="text-xs text-corporate-textTertiary">
              Detected: {formatTimestamp(finding.timestamp)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Get severity color for icons
 */
function getSeverityColor(severity: Finding['severity']): string {
  const colors = {
    critical: 'text-corporate-error',
    high: 'text-amber-400',
    medium: 'text-cyan-400',
    low: 'text-gray-400'
  };
  return colors[severity];
}

/**
 * Get severity badge styling
 */
function getSeverityBadge(severity: Finding['severity']): string {
  const badges = {
    critical: 'bg-red-900/30 text-corporate-error border border-corporate-error/50',
    high: 'bg-amber-900/30 text-amber-400 border border-amber-500/50',
    medium: 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/50',
    low: 'bg-gray-800/50 text-gray-400 border border-gray-600/50'
  };
  return badges[severity];
}

/**
 * Get severity border styling
 */
function getSeverityBorder(severity: Finding['severity']): string {
  const borders = {
    critical: 'border-corporate-error/50',
    high: 'border-amber-500/50',
    medium: 'border-cyan-500/50',
    low: 'border-corporate-borderPrimary'
  };
  return borders[severity];
}

/**
 * Get active severity button styling
 */
function getSeverityButtonActive(severity: Finding['severity']): string {
  const styles = {
    critical: 'bg-red-500 text-white',
    high: 'bg-amber-500 text-white',
    medium: 'bg-cyan-500 text-white',
    low: 'bg-gray-600 text-white'
  };
  return styles[severity];
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

export default FindingsList;
