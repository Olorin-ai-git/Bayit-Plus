/**
 * Multi-Entity View Component
 * Feature: 004-new-olorin-frontend
 *
 * Special component for displaying and managing multi-entity investigation results.
 * Provides entity comparison, correlation analysis, and cross-entity insights.
 * Uses Olorin purple styling with interactive entity selection.
 */

import React, { useState } from 'react';
import {
  UserIcon,
  ChartBarIcon,
  ArrowPathIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { EntityCard } from './EntityCard';
import { RiskGauge } from '@microservices/visualization';
import type { Entity } from '../types/wizard.types';

export interface EntityResult {
  entity: Entity;
  riskScore: number;
  findingsCount: number;
  commonConnections: string[];
  uniqueFindings: number;
}

export interface CorrelationResult {
  type: 'device' | 'location' | 'network' | 'behavior';
  description: string;
  affectedEntities: string[];
  riskImpact: number;
}

export interface MultiEntityViewProps {
  entityResults: EntityResult[];
  correlations: CorrelationResult[];
  className?: string;
}

/**
 * Multi-entity view with comparison and correlation analysis
 */
export const MultiEntityView: React.FC<MultiEntityViewProps> = ({
  entityResults,
  correlations,
  className = ''
}) => {
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'comparison'>('grid');
  const [filterMode, setFilterMode] = useState<'all' | 'correlated' | 'high-risk'>('all');

  const toggleEntitySelection = (entityId: string) => {
    setSelectedEntities((prev) =>
      prev.includes(entityId) ? prev.filter((id) => id !== entityId) : [...prev, entityId]
    );
  };

  const filteredEntities = entityResults.filter((result) => {
    if (filterMode === 'high-risk') return result.riskScore >= 60;
    if (filterMode === 'correlated') return result.commonConnections.length > 0;
    return true;
  });

  const averageRiskScore =
    filteredEntities.reduce((sum, r) => sum + r.riskScore, 0) / filteredEntities.length || 0;

  const totalFindings = filteredEntities.reduce((sum, r) => sum + r.findingsCount, 0);

  const highRiskCount = filteredEntities.filter((r) => r.riskScore >= 60).length;

  return (
    <div className={`bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-corporate-textPrimary">Multi-Entity Analysis</h2>
          <p className="text-sm text-corporate-textSecondary mt-1">
            {filteredEntities.length} entit{filteredEntities.length === 1 ? 'y' : 'ies'} analyzed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Mode */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as typeof filterMode)}
            className="px-3 py-2 bg-black/30 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary text-sm focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary"
          >
            <option value="all">All Entities</option>
            <option value="correlated">Correlated Only</option>
            <option value="high-risk">High Risk Only</option>
          </select>

          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'comparison' : 'grid')}
            className="p-2 bg-black/30 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary hover:bg-corporate-accentPrimary hover:text-white transition-colors"
            title={viewMode === 'grid' ? 'Switch to Comparison' : 'Switch to Grid'}
          >
            {viewMode === 'grid' ? <ChartBarIcon className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-black/30 backdrop-blur rounded-lg p-4 text-center">
          <p className="text-sm text-corporate-textSecondary mb-2">Average Risk</p>
          <p className="text-2xl font-bold text-corporate-textPrimary">{Math.round(averageRiskScore)}</p>
        </div>
        <div className="bg-black/30 backdrop-blur rounded-lg p-4 text-center">
          <p className="text-sm text-corporate-textSecondary mb-2">Total Findings</p>
          <p className="text-2xl font-bold text-corporate-textPrimary">{totalFindings}</p>
        </div>
        <div className="bg-black/30 backdrop-blur rounded-lg p-4 text-center">
          <p className="text-sm text-corporate-textSecondary mb-2">High Risk</p>
          <p className="text-2xl font-bold text-corporate-error">{highRiskCount}</p>
        </div>
        <div className="bg-black/30 backdrop-blur rounded-lg p-4 text-center">
          <p className="text-sm text-corporate-textSecondary mb-2">Correlations</p>
          <p className="text-2xl font-bold text-corporate-accentPrimary">{correlations.length}</p>
        </div>
      </div>

      {/* Correlations Section */}
      {correlations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3 flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5 text-corporate-accentPrimary" />
            Cross-Entity Correlations
          </h3>
          <div className="space-y-3">
            {correlations.map((correlation, index) => (
              <div
                key={index}
                className="bg-black/30 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-corporate-accentPrimary/20 border border-corporate-accentPrimary/50 rounded text-xs text-corporate-accentPrimary">
                        {correlation.type.toUpperCase()}
                      </span>
                      <span className="text-sm text-corporate-textPrimary font-medium">
                        {correlation.description}
                      </span>
                    </div>
                    <p className="text-xs text-corporate-textSecondary">
                      Affects {correlation.affectedEntities.length} entit
                      {correlation.affectedEntities.length === 1 ? 'y' : 'ies'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-corporate-textTertiary">Risk Impact</p>
                    <p className="text-lg font-bold text-corporate-error">+{correlation.riskImpact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entity Display */}
      {viewMode === 'grid' && (
        <div>
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">Entity Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEntities.map((result) => (
              <div
                key={result.entity.id}
                className={`cursor-pointer transition-all ${
                  selectedEntities.includes(result.entity.id)
                    ? 'ring-2 ring-corporate-accentPrimary'
                    : ''
                }`}
                onClick={() => toggleEntitySelection(result.entity.id)}
              >
                <EntityCard
                  entity={result.entity}
                  riskScore={result.riskScore}
                  findingsCount={result.findingsCount}
                />
                {result.commonConnections.length > 0 && (
                  <div className="mt-2 px-3 py-2 bg-corporate-accentPrimary/10 border border-corporate-accentPrimary/30 rounded text-xs text-corporate-textSecondary">
                    {result.commonConnections.length} common connection
                    {result.commonConnections.length === 1 ? '' : 's'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'comparison' && (
        <div>
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">Entity Comparison</h3>
          <div className="grid grid-cols-1 gap-4">
            {filteredEntities.map((result) => (
              <div
                key={result.entity.id}
                className="bg-black/30 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-corporate-textPrimary">
                      {result.entity.value}
                    </h4>
                    <p className="text-xs text-corporate-textSecondary mt-1">
                      {result.entity.type} " {result.findingsCount} finding
                      {result.findingsCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <RiskGauge score={result.riskScore} size="sm" showLabel={false} />
                    <div className="text-right">
                      <p className="text-xs text-corporate-textTertiary">Risk Score</p>
                      <p className="text-lg font-bold text-corporate-textPrimary">
                        {result.riskScore}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredEntities.length === 0 && (
        <div className="text-center py-12">
          <FunnelIcon className="w-12 h-12 text-corporate-textTertiary mx-auto mb-3" />
          <p className="text-sm text-corporate-textTertiary">
            No entities match the current filter criteria
          </p>
        </div>
      )}
    </div>
  );
};

export default MultiEntityView;
