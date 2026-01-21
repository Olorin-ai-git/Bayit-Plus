/**
 * Hybrid Graph Settings Component
 * Feature: 006-hybrid-graph-integration
 *
 * Form component for configuring hybrid graph investigations.
 * Includes entity type selector, entity ID input, and time range picker.
 */

import React, { useState, useCallback } from 'react';
import type { EntityType } from '../../types/hybridGraphTypes';
import {
  validateEntityId,
  validateTimeRange,
  getEntityIdPlaceholder,
  type TimeRange
} from '../../utils/hybridGraphFieldValidation';

interface HybridGraphSettingsProps {
  onConfigChange: (config: {
    entityType: EntityType;
    entityId: string;
    timeRange: TimeRange;
  }) => void;
  disabled?: boolean;
}

interface ValidationErrors {
  entityId?: string;
  timeRange?: string;
}

export function HybridGraphSettings({ onConfigChange, disabled = false }: HybridGraphSettingsProps) {
  const [entityType, setEntityType] = useState<EntityType>('user');
  const [entityId, setEntityId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: '',
    end: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  const handleEntityTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as EntityType;
    setEntityType(newType);
    setEntityId('');
    setErrors(prev => ({ ...prev, entityId: undefined }));
  }, []);

  const handleEntityIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newId = e.target.value;
    setEntityId(newId);

    const error = validateEntityId(entityType, newId);
    setErrors(prev => ({ ...prev, entityId: error }));

    if (!error && timeRange.start && timeRange.end && !errors.timeRange) {
      onConfigChange({ entityType, entityId: newId, timeRange });
    }
  }, [entityType, timeRange, errors.timeRange, onConfigChange]);

  const handleTimeRangeChange = useCallback((field: 'start' | 'end', value: string) => {
    const newTimeRange = { ...timeRange, [field]: value };
    setTimeRange(newTimeRange);

    const error = validateTimeRange(newTimeRange);
    setErrors(prev => ({ ...prev, timeRange: error }));

    if (!error && entityId && !errors.entityId) {
      onConfigChange({ entityType, entityId, timeRange: newTimeRange });
    }
  }, [timeRange, entityId, entityType, errors.entityId, onConfigChange]);

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="entity-type" className="block text-sm font-medium text-corporate-textPrimary mb-2">
          Entity Type
        </label>
        <select
          id="entity-type"
          value={entityType}
          onChange={handleEntityTypeChange}
          disabled={disabled}
          className="w-full px-4 py-2 border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur text-corporate-textPrimary rounded-md focus:ring-2 focus:ring-corporate-accentPrimary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <option value="user">User (Email)</option>
          <option value="device">Device (UUID)</option>
          <option value="ip">IP Address</option>
          <option value="transaction">Transaction ID</option>
        </select>
      </div>

      <div>
        <label htmlFor="entity-id" className="block text-sm font-medium text-corporate-textPrimary mb-2">
          Entity ID
        </label>
        <input
          id="entity-id"
          type="text"
          value={entityId}
          onChange={handleEntityIdChange}
          placeholder={getEntityIdPlaceholder(entityType)}
          disabled={disabled}
          className={`w-full px-4 py-2 border rounded-md bg-black/40 backdrop-blur text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-2 focus:ring-corporate-accentPrimary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            errors.entityId ? 'border-error' : 'border-corporate-borderPrimary'
          }`}
        />
        {errors.entityId && (
          <p className="mt-1 text-sm text-error">{errors.entityId}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="time-start" className="block text-sm font-medium text-corporate-textPrimary mb-2">
            Start Time
          </label>
          <input
            id="time-start"
            type="datetime-local"
            value={timeRange.start}
            onChange={(e) => handleTimeRangeChange('start', e.target.value)}
            disabled={disabled}
            className="w-full px-4 py-2 border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur text-corporate-textPrimary rounded-md focus:ring-2 focus:ring-corporate-accentPrimary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
        </div>
        <div>
          <label htmlFor="time-end" className="block text-sm font-medium text-corporate-textPrimary mb-2">
            End Time
          </label>
          <input
            id="time-end"
            type="datetime-local"
            value={timeRange.end}
            onChange={(e) => handleTimeRangeChange('end', e.target.value)}
            disabled={disabled}
            className="w-full px-4 py-2 border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur text-corporate-textPrimary rounded-md focus:ring-2 focus:ring-corporate-accentPrimary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
        </div>
      </div>
      {errors.timeRange && (
        <p className="text-sm text-error">{errors.timeRange}</p>
      )}
    </div>
  );
}
