/**
 * Investigation Card Component
 * Displays investigation information in a card format
 */

import React from 'react';
import { Investigation } from '../../types/investigations';
import { StatusBadge } from './StatusBadge';

interface InvestigationCardProps {
  investigation: Investigation;
  onClick: () => void;
  onView?: () => void;
  onDelete?: () => void;
  onReplay?: () => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

/**
 * Get risk severity level from score (0-100)
 */
const getRiskSeverity = (score: number | null | undefined): 'no-risk' | 'low' | 'medium' | 'high' => {
  if (score === null || score === undefined || score === 0) return 'no-risk';
  if (score >= 60) return 'high'; // High risk: red
  if (score >= 40) return 'medium'; // Medium: orange
  return 'low'; // Low: yellow
};

/**
 * Get risk color classes based on severity
 */
const getRiskColors = (severity: 'no-risk' | 'low' | 'medium' | 'high') => {
  switch (severity) {
    case 'high':
      return {
        border: 'border-red-500/60',
        borderHover: 'hover:border-red-500',
        shadow: 'hover:shadow-red-500/30',
        text: 'text-red-400',
        bg: 'bg-red-900/20'
      };
    case 'medium':
      return {
        border: 'border-orange-500/60',
        borderHover: 'hover:border-orange-500',
        shadow: 'hover:shadow-orange-500/30',
        text: 'text-orange-400',
        bg: 'bg-orange-900/20'
      };
    case 'low':
      return {
        border: 'border-yellow-500/60',
        borderHover: 'hover:border-yellow-500',
        shadow: 'hover:shadow-yellow-500/30',
        text: 'text-yellow-400',
        bg: 'bg-yellow-900/20'
      };
    case 'no-risk':
      return {
        border: 'border-green-500/60',
        borderHover: 'hover:border-green-500',
        shadow: 'hover:shadow-green-500/30',
        text: 'text-green-400',
        bg: 'bg-green-900/20'
      };
  }
};

/**
 * Extract a short summary from LLM thoughts
 */
const getLLMThoughtsSummary = (investigation: Investigation): string | null => {
  // Combine all LLM thoughts
  const thoughts = [
    investigation.device_llm_thoughts,
    investigation.location_llm_thoughts,
    investigation.network_llm_thoughts,
    investigation.logs_llm_thoughts
  ].filter(Boolean).join(' ');

  if (!thoughts) return null;

  // Remove markdown formatting and extract first meaningful sentence
  const cleaned = thoughts
    .replace(/#{1,6}\s+/g, '') // Remove markdown headers
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .trim();

  // Extract first sentence or first 150 characters
  const firstSentence = cleaned.match(/^[^.!?]+[.!?]/)?.[0] || cleaned.substring(0, 150);
  return firstSentence.length > 150 ? firstSentence.substring(0, 147) + '...' : firstSentence;
};

export const InvestigationCard: React.FC<InvestigationCardProps> = ({
  investigation,
  onClick,
  onView,
  onDelete,
  onReplay,
  isSelected = false,
  onSelect
}) => {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleString();
    } catch {
      return '—';
    }
  };

  // Calculate overall risk score - use overall_risk_score if available, otherwise calculate from domain scores
  const calculateOverallRiskScore = (): number | null => {
    // If overall_risk_score exists, use it
    if (investigation.overall_risk_score !== null && investigation.overall_risk_score !== undefined) {
      return investigation.overall_risk_score > 1 
        ? investigation.overall_risk_score 
        : investigation.overall_risk_score * 100;
    }
    
    // Otherwise, calculate from domain risk scores (average of available domain scores)
    const domainScores: number[] = [];
    
    if (investigation.device_risk_score !== null && investigation.device_risk_score !== undefined) {
      domainScores.push(investigation.device_risk_score > 1 ? investigation.device_risk_score : investigation.device_risk_score * 100);
    }
    if (investigation.location_risk_score !== null && investigation.location_risk_score !== undefined) {
      domainScores.push(investigation.location_risk_score > 1 ? investigation.location_risk_score : investigation.location_risk_score * 100);
    }
    if (investigation.network_risk_score !== null && investigation.network_risk_score !== undefined) {
      domainScores.push(investigation.network_risk_score > 1 ? investigation.network_risk_score : investigation.network_risk_score * 100);
    }
    if (investigation.logs_risk_score !== null && investigation.logs_risk_score !== undefined) {
      domainScores.push(investigation.logs_risk_score > 1 ? investigation.logs_risk_score : investigation.logs_risk_score * 100);
    }
    
    // Return average if we have at least one domain score
    if (domainScores.length > 0) {
      return domainScores.reduce((sum, score) => sum + score, 0) / domainScores.length;
    }
    
    return null;
  };

  const normalizedRiskScore = calculateOverallRiskScore();
  const riskSeverity = getRiskSeverity(normalizedRiskScore);
  const riskColors = getRiskColors(riskSeverity);
  const llmSummary = getLLMThoughtsSummary(investigation);

  // Get border color based on severity (using inline styles to ensure it works)
  // High risk: red, Medium: orange, Low: yellow, No risk: green
  const getBorderColor = () => {
    switch (riskSeverity) {
      case 'high':
        return 'rgba(239, 68, 68, 0.8)'; // red-500 with 80% opacity
      case 'medium':
        return 'rgba(249, 115, 22, 0.8)'; // orange-500 with 80% opacity
      case 'low':
        return 'rgba(234, 179, 8, 0.8)'; // yellow-500 with 80% opacity
      case 'no-risk':
      default:
        return 'rgba(34, 197, 94, 0.8)'; // green-500 with 80% opacity
    }
  };

  const getHoverBorderColor = () => {
    switch (riskSeverity) {
      case 'high':
        return 'rgba(239, 68, 68, 1)'; // red-500 full opacity
      case 'medium':
        return 'rgba(249, 115, 22, 1)'; // orange-500 full opacity
      case 'low':
        return 'rgba(234, 179, 8, 1)'; // yellow-500 full opacity
      case 'no-risk':
      default:
        return 'rgba(34, 197, 94, 1)'; // green-500 full opacity
    }
  };
  
  const getShadowColor = () => {
    switch (riskSeverity) {
      case 'high':
        return 'rgba(239, 68, 68, 0.3)'; // red-500 with 30% opacity
      case 'medium':
        return 'rgba(249, 115, 22, 0.3)'; // orange-500 with 30% opacity
      case 'low':
        return 'rgba(234, 179, 8, 0.3)'; // yellow-500 with 30% opacity
      case 'no-risk':
      default:
        return 'rgba(34, 197, 94, 0.3)'; // green-500 with 30% opacity
    }
  };

  const borderColor = getBorderColor();
  const hoverBorderColor = getHoverBorderColor();
  const shadowColor = getShadowColor();

  // Debug logging
  React.useEffect(() => {
    console.log('[InvestigationCard] Risk Calculation:', {
      id: investigation.id,
      name: investigation.name || investigation.id,
      overall_risk_score: investigation.overall_risk_score,
      device_risk_score: investigation.device_risk_score,
      location_risk_score: investigation.location_risk_score,
      network_risk_score: investigation.network_risk_score,
      logs_risk_score: investigation.logs_risk_score,
      calculatedScore: normalizedRiskScore,
      severity: riskSeverity,
      borderColor: borderColor,
    });
  }, [investigation.id, normalizedRiskScore, riskSeverity, borderColor]);

  return (
    <div
      onClick={onClick}
      className="group relative bg-black/40 backdrop-blur-md rounded-lg p-6 transition-all duration-300 cursor-pointer"
      style={{
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: borderColor,
        borderTopColor: borderColor,
        borderRightColor: borderColor,
        borderBottomColor: borderColor,
        borderLeftColor: borderColor,
        boxShadow: 'none',
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = hoverBorderColor;
        e.currentTarget.style.boxShadow = `0 10px 15px -3px ${shadowColor}, 0 4px 6px -2px ${shadowColor}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = borderColor;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        {/* Checkbox for selection */}
        {onSelect && (
          <div className="flex-shrink-0 mr-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 rounded border-2 border-corporate-borderPrimary bg-corporate-bgSecondary checked:bg-corporate-accentPrimary checked:border-corporate-accentPrimary cursor-pointer transition-colors"
              aria-label={`Select investigation ${investigation.name || investigation.id}`}
            />
          </div>
        )}
        <div className="flex-1 mr-4 min-w-0">
          <h3 className="text-xl font-bold text-corporate-accentPrimary group-hover:text-corporate-accentSecondary transition-colors truncate" title={investigation.name || investigation.id}>
            {investigation.name || investigation.id}
          </h3>
          {/* Risk Score Display */}
          {normalizedRiskScore !== null && (
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm font-semibold ${riskColors.text}`}>
                Risk Score: {normalizedRiskScore.toFixed(1)}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColors.bg} ${riskColors.text} border ${riskColors.border}/50`}>
                {riskSeverity === 'no-risk' ? 'NO RISK' : riskSeverity.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <StatusBadge status={investigation.status} />
      </div>

      {/* Meta Information */}
      <div className="flex flex-wrap gap-4 text-sm text-corporate-textSecondary mb-3">
        {/* Investigation ID */}
        <span className="font-mono">
          ID: <strong className="text-corporate-textPrimary">{investigation.id}</strong>
        </span>
        {investigation.entity_id && (
          <span>
            Entity ID: <strong className="text-corporate-textPrimary">{investigation.entity_id}</strong>
          </span>
        )}
        {investigation.entity_type && (
          <span>
            Entity Type: <strong className="text-corporate-textPrimary capitalize">{investigation.entity_type}</strong>
          </span>
        )}
        {investigation.owner && (
          <span>
            Owner: <strong className="text-corporate-textPrimary">{investigation.owner}</strong>
          </span>
        )}
        {investigation.riskModel && (
          <span>
            Model: <strong className="text-corporate-textPrimary">{investigation.riskModel}</strong>
          </span>
        )}
        <span>
          Updated: {formatDate(investigation.updated)}
        </span>
      </div>

      {/* Description */}
      {investigation.description && (
        <p className="text-corporate-textSecondary mb-4 line-clamp-2" title={investigation.description}>
          {investigation.description}
        </p>
      )}

      {/* LLM Thoughts Summary */}
      {llmSummary && (
        <div className="mb-4 p-3 bg-corporate-bgSecondary/50 rounded-lg border border-corporate-borderPrimary/30">
          <p className="text-xs text-corporate-textSecondary mb-1 font-semibold">AI Analysis Summary:</p>
          <p className="text-sm text-corporate-textPrimary line-clamp-2" title={llmSummary}>
            {llmSummary}
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {investigation.progress !== null && investigation.progress !== undefined && (
        <div className="mb-4">
          <div className="h-2 bg-corporate-bgSecondary rounded-full overflow-hidden border border-corporate-borderPrimary/40">
            <div
              className="h-full bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary transition-all duration-300"
              style={{ width: `${investigation.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Domain Risk Scores */}
      {(investigation.device_risk_score !== null && investigation.device_risk_score !== undefined) ||
       (investigation.location_risk_score !== null && investigation.location_risk_score !== undefined) ||
       (investigation.network_risk_score !== null && investigation.network_risk_score !== undefined) ||
       (investigation.logs_risk_score !== null && investigation.logs_risk_score !== undefined) ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {investigation.device_risk_score !== null && investigation.device_risk_score !== undefined && (
            <span className="px-2 py-1 rounded text-xs border border-purple-500/40 text-purple-400 bg-purple-900/20">
              Device: {((investigation.device_risk_score > 1 ? investigation.device_risk_score : investigation.device_risk_score * 100)).toFixed(0)}
            </span>
          )}
          {investigation.location_risk_score !== null && investigation.location_risk_score !== undefined && (
            <span className="px-2 py-1 rounded text-xs border border-purple-500/40 text-purple-400 bg-purple-900/20">
              Location: {((investigation.location_risk_score > 1 ? investigation.location_risk_score : investigation.location_risk_score * 100)).toFixed(0)}
            </span>
          )}
          {investigation.network_risk_score !== null && investigation.network_risk_score !== undefined && (
            <span className="px-2 py-1 rounded text-xs border border-purple-500/40 text-purple-400 bg-purple-900/20">
              Network: {((investigation.network_risk_score > 1 ? investigation.network_risk_score : investigation.network_risk_score * 100)).toFixed(0)}
            </span>
          )}
          {investigation.logs_risk_score !== null && investigation.logs_risk_score !== undefined && (
            <span className="px-2 py-1 rounded text-xs border border-purple-500/40 text-purple-400 bg-purple-900/20">
              Logs: {((investigation.logs_risk_score > 1 ? investigation.logs_risk_score : investigation.logs_risk_score * 100)).toFixed(0)}
            </span>
          )}
        </div>
      ) : null}

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {investigation.sources && investigation.sources.length > 0 && (
          <span className="px-2 py-1 rounded text-xs border border-corporate-borderPrimary/40 text-corporate-textSecondary bg-corporate-bgSecondary/50">
            {investigation.sources.length} source{investigation.sources.length !== 1 ? 's' : ''}
          </span>
        )}
        {investigation.tools && investigation.tools.length > 0 && (
          <span className="px-2 py-1 rounded text-xs border border-corporate-borderPrimary/40 text-corporate-textSecondary bg-corporate-bgSecondary/50">
            {investigation.tools.length} tool{investigation.tools.length !== 1 ? 's' : ''}
          </span>
        )}
        {investigation.phases?.find(p => p.status === 'in-progress')?.name && (
          <span className="px-2 py-1 rounded text-xs border border-corporate-borderPrimary/40 text-corporate-textSecondary bg-corporate-bgSecondary/50">
            {investigation.phases.find(p => p.status === 'in-progress')!.name}
          </span>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-corporate-borderPrimary/40">
        <div className="text-xs text-corporate-textTertiary">
          {investigation.from && investigation.to && (
            <>
              {formatDate(investigation.from)} - {formatDate(investigation.to)}
            </>
          )}
        </div>
        <div className="flex gap-2">
          {onView && (
            <button
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="px-3 py-1.5 text-xs font-medium bg-corporate-accentPrimary/10 border border-corporate-accentPrimary/40 rounded hover:bg-corporate-accentPrimary/20 hover:border-corporate-accentPrimary text-corporate-accentPrimary transition-all duration-200"
              title="View investigation details"
              aria-label="View investigation"
            >
              View
            </button>
          )}
          {onReplay && (
            <button
              onClick={(e) => { e.stopPropagation(); onReplay(); }}
              className="px-3 py-1.5 text-xs font-medium bg-purple-500/10 border border-purple-500/40 rounded hover:bg-purple-500/20 hover:border-purple-500 text-purple-400 transition-all duration-200"
              title="Replay investigation with modified parameters"
              aria-label="Replay investigation"
            >
              Replay
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="px-3 py-1.5 text-xs font-medium bg-corporate-error/10 border border-corporate-error/40 rounded hover:bg-corporate-error/20 hover:border-corporate-error text-corporate-error transition-all duration-200"
              title="Delete investigation"
              aria-label="Delete investigation"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

