/**
 * Entity Card Component
 * Feature: 004-new-olorin-frontend
 *
 * Displays entity information with risk score and associated findings.
 * Uses Olorin purple styling with entity type badges.
 */

import React from 'react';
import { Entity, EntityType } from '@shared/types/entities.types';
import { RiskGauge } from '@microservices/visualization';

export interface EntityCardProps {
  entity: Entity;
  riskScore: number;
  findingsCount?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Entity card with risk score display
 */
export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  riskScore,
  findingsCount = 0,
  onClick,
  className = ''
}) => {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`w-full bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg p-4 ${
        onClick ? 'hover:border-corporate-accentPrimary transition-colors cursor-pointer' : ''
      } ${className}`}
    >
      {/* Entity Header */}
      <div className="flex items-start justify-between mb-3">
        {/* Entity Type Badge */}
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${getEntityTypeColor(entity.type)}`}
        >
          {getEntityTypeLabel(entity.type)}
        </span>

        {/* Risk Gauge */}
        <RiskGauge score={riskScore} size="sm" showLabel={false} />
      </div>

      {/* Entity Value */}
      <div className="mb-3">
        <p className="text-lg font-semibold text-corporate-textPrimary break-all">
          {entity.value}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-corporate-textTertiary">
          {findingsCount} {findingsCount === 1 ? 'finding' : 'findings'}
        </span>
        <span className={`font-medium ${getRiskScoreColor(riskScore)}`}>
          Risk: {riskScore}
        </span>
      </div>
    </Component>
  );
};

/**
 * Get entity type label for display
 */
function getEntityTypeLabel(entityType: EntityType): string {
  const labels: Record<EntityType, string> = {
    [EntityType.EMAIL]: 'Email',
    [EntityType.USER_ID]: 'User ID',
    [EntityType.IP_ADDRESS]: 'IP Address',
    [EntityType.DEVICE_ID]: 'Device ID',
    [EntityType.PHONE_NUMBER]: 'Phone',
    [EntityType.TRANSACTION_ID]: 'Transaction',
    [EntityType.ACCOUNT_ID]: 'Account'
  };
  return labels[entityType];
}

/**
 * Get color classes for entity type badge
 */
function getEntityTypeColor(entityType: EntityType): string {
  const colors: Record<EntityType, string> = {
    [EntityType.EMAIL]: 'bg-blue-900/30 text-blue-400 border border-blue-500/50',
    [EntityType.USER_ID]: 'bg-purple-900/30 text-purple-400 border border-purple-500/50',
    [EntityType.IP_ADDRESS]: 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/50',
    [EntityType.DEVICE_ID]: 'bg-corporate-success/30 text-corporate-success border border-corporate-success/50',
    [EntityType.PHONE_NUMBER]: 'bg-amber-900/30 text-amber-400 border border-amber-500/50',
    [EntityType.TRANSACTION_ID]: 'bg-pink-900/30 text-pink-400 border border-pink-500/50',
    [EntityType.ACCOUNT_ID]: 'bg-indigo-900/30 text-indigo-400 border border-indigo-500/50'
  };
  return colors[entityType];
}

/**
 * Get risk score text color
 */
function getRiskScoreColor(score: number): string {
  if (score >= 80) return 'text-corporate-error';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-cyan-400';
  return 'text-gray-400';
}

export default EntityCard;
