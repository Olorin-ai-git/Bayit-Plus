/**
 * DomainCard Component
 *
 * A card component for visualizing domain information with interactive
 * features, risk indicators, and relationship mapping.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React, { useCallback, useState } from 'react';

export interface Domain {
  id: string;
  name: string;
  type: 'financial' | 'identity' | 'device' | 'location' | 'network' | 'behavioral' | 'temporal';
  riskScore: number; // 0-1
  confidence: number; // 0-1
  evidenceCount: number;
  lastUpdated: string;
  description?: string;
  metadata: {
    source?: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    attributes?: Record<string, unknown>;
  };
  relationships?: {
    connectedDomains?: string[];
    evidenceIds?: string[];
    agentIds?: string[];
    parentDomainId?: string;
    childDomainIds?: string[];
  };
  insights?: {
    summary?: string;
    keyFindings?: string[];
    anomalies?: string[];
    patterns?: string[];
  };
}

export interface EnergyMetrics {
  level: number; // 0-100 energy level percentage
  flow: number; // Flow rate (connections/evidence count)
  stability: number; // 0-100 stability percentage
}

export interface DomainCardProps {
  /** Domain data to display */
  domain: Domain;
  /** Card size variant */
  size?: 'small' | 'medium' | 'large';
  /** Show detailed information */
  showDetails?: boolean;
  /** Show risk visualization */
  showRiskVisualization?: boolean;
  /** Show relationship indicators */
  showRelationships?: boolean;
  /** Enable interactive features */
  interactive?: boolean;
  /** Card selection state */
  selected?: boolean;
  /** Card hover state */
  hovered?: boolean;
  /** Energy metrics for power grid concept */
  energyMetrics?: EnergyMetrics;
  /** Custom domain icon renderer */
  iconRenderer?: (domain: Domain) => React.ReactNode;
  /** Custom risk indicator renderer */
  riskRenderer?: (riskScore: number, confidence: number) => React.ReactNode;
  /** Callback for card click */
  onClick?: (domain: Domain) => void;
  /** Callback for card hover */
  onHover?: (domain: Domain | null) => void;
  /** Callback for evidence click */
  onEvidenceClick?: (domain: Domain) => void;
  /** Callback for relationship click */
  onRelationshipClick?: (domain: Domain, relatedDomainId: string) => void;
  /** Custom styling classes */
  className?: string;
}

export const DomainCard: React.FC<DomainCardProps> = ({
  domain,
  size = 'medium',
  showDetails = true,
  showRiskVisualization = true,
  showRelationships = true,
  interactive = true,
  selected = false,
  hovered = false,
  energyMetrics,
  iconRenderer,
  riskRenderer,
  onClick,
  onHover,
  onEvidenceClick,
  onRelationshipClick,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    onClick?.(domain);
  }, [interactive, onClick, domain]);

  const handleMouseEnter = useCallback(() => {
    if (!interactive) return;
    onHover?.(domain);
  }, [interactive, onHover, domain]);

  const handleMouseLeave = useCallback(() => {
    if (!interactive) return;
    onHover?.(null);
  }, [interactive, onHover]);

  const handleEvidenceClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEvidenceClick?.(domain);
  }, [onEvidenceClick, domain]);

  const handleRelationshipClick = useCallback((relatedDomainId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onRelationshipClick?.(domain, relatedDomainId);
  }, [onRelationshipClick, domain]);

  const toggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => !prev);
  }, []);

  const getDomainIcon = (type: string) => {
    if (iconRenderer) return iconRenderer(domain);

    switch (type) {
      case 'financial': return '💰';
      case 'identity': return '👤';
      case 'device': return '📱';
      case 'location': return '📍';
      case 'network': return '🌐';
      case 'behavioral': return '🎭';
      case 'temporal': return '⏰';
      default: return '📊';
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 0.8) return 'text-red-600 bg-red-100';
    if (riskScore >= 0.6) return 'text-orange-600 bg-orange-100';
    if (riskScore >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatRiskScore = (score: number) => Math.round(score * 100);
  const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleString();

  const getSizeClasses = () => {
    switch (size) {
      case 'small': return 'p-3';
      case 'large': return 'p-6';
      default: return 'p-4';
    }
  };

  const getCardClasses = () => {
    const baseClasses = `domain-card bg-white border rounded-lg transition-all duration-200 ${getSizeClasses()}`;

    let stateClasses = '';
    if (selected) stateClasses += ' ring-2 ring-blue-500 border-blue-300';
    else if (hovered) stateClasses += ' border-blue-200 shadow-md';
    else stateClasses += ' border-gray-200 shadow-sm';

    if (interactive) stateClasses += ' cursor-pointer hover:shadow-md';

    return `${baseClasses} ${stateClasses} ${className}`;
  };

  return (
    <div
      className={getCardClasses()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={interactive ? "button" : "article"}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => interactive && e.key === 'Enter' && handleClick(e)}
      aria-selected={selected}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">
            {getDomainIcon(domain.type)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className={`font-semibold text-gray-900 truncate ${
              size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
            }`}>
              {domain.name}
            </h3>
            <p className={`text-gray-600 capitalize ${
              size === 'small' ? 'text-xs' : 'text-sm'
            }`}>
              {domain.type} domain
            </p>
          </div>
        </div>

        {domain.metadata.priority && (
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
            getPriorityColor(domain.metadata.priority)
          }`}>
            {domain.metadata.priority}
          </span>
        )}
      </div>

      {/* Risk Visualization */}
      {showRiskVisualization && (
        <div className="mt-3 space-y-2">
          {riskRenderer ? riskRenderer(domain.riskScore, domain.confidence) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${getRiskColor(domain.riskScore)}`}>
                  {formatRiskScore(domain.riskScore)}% Risk
                </span>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  {formatRiskScore(domain.confidence)}% Confidence
                </span>
              </div>

              {domain.evidenceCount > 0 && (
                <button
                  onClick={handleEvidenceClick}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {domain.evidenceCount} evidence
                </button>
              )}
            </div>
          )}

          {/* Risk progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                domain.riskScore >= 0.8 ? 'bg-red-500' :
                domain.riskScore >= 0.6 ? 'bg-orange-500' :
                domain.riskScore >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${domain.riskScore * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Energy Metrics (Power Grid Mode) */}
      {energyMetrics && (
        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600">⚡</span>
            <span className="text-sm font-medium text-blue-900">Energy Status</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className={`font-medium ${energyMetrics.level > 70 ? 'text-green-600' : energyMetrics.level > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                {energyMetrics.level}%
              </div>
              <div className="text-gray-600">Level</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-blue-600">{energyMetrics.flow}</div>
              <div className="text-gray-600">Flow</div>
            </div>
            <div className="text-center">
              <div className={`font-medium ${energyMetrics.stability > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                {energyMetrics.stability}%
              </div>
              <div className="text-gray-600">Stable</div>
            </div>
          </div>

          {/* Energy flow visualization */}
          <div className="flex space-x-1">
            <div className="flex-1 bg-blue-200 rounded-full h-1">
              <div
                className="h-1 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                style={{ width: `${energyMetrics.level}%` }}
              />
            </div>
            <div className={`w-2 h-2 rounded-full ${energyMetrics.flow > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
          </div>
        </div>
      )}

      {/* Description */}
      {showDetails && domain.description && (
        <p className={`mt-3 text-gray-600 ${
          size === 'small' ? 'text-xs' : 'text-sm'
        } ${expanded ? '' : 'line-clamp-2'}`}>
          {domain.description}
        </p>
      )}

      {/* Tags */}
      {showDetails && domain.metadata.tags && domain.metadata.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {domain.metadata.tags.slice(0, expanded ? undefined : 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded"
            >
              {tag}
            </span>
          ))}
          {!expanded && domain.metadata.tags.length > 3 && (
            <span className="px-2 py-1 text-xs text-gray-500">
              +{domain.metadata.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Insights (expanded) */}
      {expanded && showDetails && domain.insights && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
          {domain.insights.summary && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Summary</h4>
              <p className="text-sm text-gray-600">{domain.insights.summary}</p>
            </div>
          )}

          {domain.insights.keyFindings && domain.insights.keyFindings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Key Findings</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {domain.insights.keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1 flex-shrink-0">✓</span>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {domain.insights.anomalies && domain.insights.anomalies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Anomalies</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {domain.insights.anomalies.map((anomaly, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1 flex-shrink-0">⚠</span>
                    {anomaly}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Relationships */}
      {showRelationships && domain.relationships?.connectedDomains &&
       domain.relationships.connectedDomains.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Connected Domains
            </span>
            <span className="text-xs text-gray-500">
              {domain.relationships.connectedDomains.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {domain.relationships.connectedDomains.slice(0, 3).map(relatedId => (
              <button
                key={relatedId}
                onClick={(e) => handleRelationshipClick(relatedId, e)}
                className="px-2 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 transition-colors"
              >
                {relatedId.slice(0, 8)}...
              </button>
            ))}
            {domain.relationships.connectedDomains.length > 3 && (
              <span className="px-2 py-1 text-xs text-gray-500">
                +{domain.relationships.connectedDomains.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>Updated {formatTimestamp(domain.lastUpdated)}</span>

        {showDetails && domain.insights && (
          <button
            onClick={toggleExpanded}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DomainCard;