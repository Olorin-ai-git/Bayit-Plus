/**
 * Recommendations List Component
 * Feature: 004-new-olorin-frontend
 *
 * Displays actionable recommendations based on investigation findings.
 * Uses Olorin purple styling with priority indicators.
 */

import React from 'react';
import { LightBulbIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  actionSteps: string[];
  relatedFindings: string[];
}

export interface RecommendationsListProps {
  recommendations: Recommendation[];
  maxHeight?: string;
  className?: string;
}

/**
 * Recommendations list with action steps
 */
export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  recommendations,
  maxHeight = 'max-h-96',
  className = ''
}) => {
  if (recommendations.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <LightBulbIcon className="w-12 h-12 text-corporate-textTertiary mx-auto mb-3" />
        <p className="text-sm text-corporate-textTertiary">No recommendations available</p>
      </div>
    );
  }

  return (
    <div className={`${maxHeight} overflow-y-auto space-y-4 ${className}`}>
      {recommendations.map((recommendation) => (
        <div
          key={recommendation.id}
          className={`bg-black/40 backdrop-blur-md border rounded-lg p-4 ${getPriorityBorder(
            recommendation.priority
          )}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 flex-1">
              <LightBulbIcon
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${getPriorityColor(
                  recommendation.priority
                )}`}
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-corporate-textPrimary">
                  {recommendation.title}
                </h4>
                <p className="text-xs text-corporate-textTertiary mt-1">
                  {recommendation.category}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-3 ${getPriorityBadge(
                recommendation.priority
              )}`}
            >
              {recommendation.priority} priority
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-corporate-textSecondary mb-4">{recommendation.description}</p>

          {/* Action Steps */}
          {recommendation.actionSteps.length > 0 && (
            <div className="mb-4">
              <h5 className="text-xs font-semibold text-corporate-textPrimary mb-2">
                Recommended Actions:
              </h5>
              <ul className="space-y-2">
                {recommendation.actionSteps.map((step, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-corporate-textSecondary"
                  >
                    <CheckCircleIcon className="w-4 h-4 text-corporate-success flex-shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Findings */}
          {recommendation.relatedFindings.length > 0 && (
            <div className="pt-3 border-t border-corporate-borderPrimary">
              <p className="text-xs text-corporate-textTertiary">
                Related to {recommendation.relatedFindings.length} finding
                {recommendation.relatedFindings.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Get priority color for icons
 */
function getPriorityColor(priority: Recommendation['priority']): string {
  const colors = {
    high: 'text-corporate-error',
    medium: 'text-amber-400',
    low: 'text-cyan-400'
  };
  return colors[priority];
}

/**
 * Get priority badge styling
 */
function getPriorityBadge(priority: Recommendation['priority']): string {
  const badges = {
    high: 'bg-red-900/30 text-corporate-error border border-corporate-error/50',
    medium: 'bg-amber-900/30 text-amber-400 border border-amber-500/50',
    low: 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/50'
  };
  return badges[priority];
}

/**
 * Get priority border styling
 */
function getPriorityBorder(priority: Recommendation['priority']): string {
  const borders = {
    high: 'border-corporate-error/50',
    medium: 'border-amber-500/50',
    low: 'border-cyan-500/50'
  };
  return borders[priority];
}

export default RecommendationsList;
