/**
 * Entity List Component
 * Feature: 004-new-olorin-frontend
 *
 * Displays list of added entities with remove capability.
 * Uses Olorin purple corporate colors and entity type badges.
 */

import React from 'react';
import { Entity, EntityType } from '@shared/types/entities.types';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface EntityListProps {
  entities: Entity[];
  onEntityRemove: (index: number) => void;
  className?: string;
}

/**
 * Entity list with remove buttons and type badges
 */
export const EntityList: React.FC<EntityListProps> = ({
  entities,
  onEntityRemove,
  className = ''
}) => {
  if (entities.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-sm text-corporate-textTertiary">
          No entities added yet
        </p>
        <p className="text-xs text-corporate-textTertiary mt-2">
          Add entities to begin investigation
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {entities.map((entity, index) => (
        <div
          key={`${entity.type}-${entity.value}-${index}`}
          className="flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg hover:border-corporate-accentPrimary transition-colors"
        >
          {/* Entity Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Entity Type Badge */}
            <span
              className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getEntityTypeColor(entity.type)}`}
            >
              {getEntityTypeLabel(entity.type)}
            </span>

            {/* Entity Value */}
            <span className="text-sm text-corporate-textPrimary truncate">
              {entity.value}
            </span>
          </div>

          {/* Remove Button */}
          <button
            type="button"
            onClick={() => onEntityRemove(index)}
            className="ml-3 p-2 hover:bg-corporate-error/20 rounded transition-colors flex-shrink-0"
            title="Remove entity"
          >
            <XMarkIcon className="w-5 h-5 text-corporate-error" />
          </button>
        </div>
      ))}

      {/* Entity Count */}
      <div className="flex items-center justify-between pt-2 text-xs text-corporate-textTertiary">
        <span>{entities.length} {entities.length === 1 ? 'entity' : 'entities'} added</span>
      </div>
    </div>
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

export default EntityList;
