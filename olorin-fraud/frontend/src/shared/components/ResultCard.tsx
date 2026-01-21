/**
 * Result Card Component
 * Feature: 004-new-olorin-frontend
 *
 * Displays individual investigation result with collapsible details.
 * Uses Olorin purple styling with risk-level color coding.
 */

import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { RiskGauge } from '@microservices/visualization';

export interface Result {
  id: string;
  title: string;
  description: string;
  riskScore: number;
  category: string;
  findings: string[];
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface ResultCardProps {
  result: Result;
  initiallyExpanded?: boolean;
  className?: string;
}

/**
 * Result card with expandable findings
 */
export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  initiallyExpanded = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  return (
    <div
      className={`bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg overflow-hidden ${className}`}
    >
      {/* Card Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-black/30 backdrop-blur transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Risk Gauge */}
          <RiskGauge score={result.riskScore} size="md" showLabel={false} />

          {/* Title and Description */}
          <div className="flex-1 text-left min-w-0">
            <h3 className="text-lg font-semibold text-corporate-textPrimary truncate">
              {result.title}
            </h3>
            <p className="text-sm text-corporate-textSecondary mt-1 truncate">
              {result.description}
            </p>
          </div>

          {/* Category Badge */}
          <span className="px-3 py-1 bg-black/30 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-full text-xs font-medium text-corporate-textSecondary whitespace-nowrap">
            {result.category}
          </span>
        </div>

        {/* Expand Icon */}
        <ChevronDownIcon
          className={`w-5 h-5 text-corporate-textSecondary transition-transform ml-4 flex-shrink-0 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 py-4 border-t border-corporate-borderPrimary space-y-4">
          {/* Findings */}
          {result.findings.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-corporate-textPrimary mb-3">
                Findings ({result.findings.length})
              </h4>
              <ul className="space-y-2">
                {result.findings.map((finding, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-corporate-textSecondary"
                  >
                    <span className="text-corporate-accentPrimary mt-1">"</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata */}
          {result.metadata && Object.keys(result.metadata).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-corporate-textPrimary mb-3">
                Additional Details
              </h4>
              <div className="bg-black/30 backdrop-blur rounded-lg p-4">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(result.metadata).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs font-medium text-corporate-textTertiary">
                        {formatKey(key)}
                      </dt>
                      <dd className="text-sm text-corporate-textPrimary mt-1">
                        {formatValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="pt-2 border-t border-corporate-borderPrimary">
            <p className="text-xs text-corporate-textTertiary">
              Detected: {formatTimestamp(result.timestamp)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Format metadata key for display
 */
function formatKey(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format metadata value for display
 */
function formatValue(value: any): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

export default ResultCard;
