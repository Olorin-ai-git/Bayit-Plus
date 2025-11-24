/**
 * Entity Input Component
 * Feature: 004-new-olorin-frontend
 *
 * Input field for adding entities with type selection and validation.
 * Uses Olorin purple corporate colors and validates entity values.
 */

import React, { useState } from 'react';
import { Entity, EntityType } from '@shared/types/entities.types';
import { validateEntityValue } from '@shared/utils/validation';
import { PlusIcon } from '@heroicons/react/24/outline';
import { EntitySelector } from './EntitySelector';

export interface EntityInputProps {
  onEntityAdd: (entity: Entity) => void;
  maxEntities?: number;
  currentEntityCount?: number;
  className?: string;
}

/**
 * Entity input with type selector and validation
 */
export const EntityInput: React.FC<EntityInputProps> = ({
  onEntityAdd,
  maxEntities = 10,
  currentEntityCount = 0,
  className = ''
}) => {
  const [entityType, setEntityType] = useState<EntityType>(EntityType.EMAIL);
  const [entityValue, setEntityValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canAddMore = currentEntityCount < maxEntities;

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEntityValue(value);

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleAdd = () => {
    if (!entityValue.trim()) {
      setError('Entity value is required');
      return;
    }

    // Validate entity value
    const validation = validateEntityValue(entityType, entityValue.trim());
    if (!validation.valid) {
      setError(validation.error || 'Invalid entity value');
      return;
    }

    // Create entity object
    const entity: Entity = {
      type: entityType,
      value: entityValue.trim()
    };

    // Call parent handler
    onEntityAdd(entity);

    // Reset form
    setEntityValue('');
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canAddMore) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Entity Type Selector */}
      <div>
        <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
          Entity Type
        </label>
        <EntitySelector
          value={entityType}
          onChange={setEntityType}
          disabled={!canAddMore}
        />
      </div>

      {/* Entity Value Input */}
      <div>
        <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
          Entity Value
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={entityValue}
            onChange={handleValueChange}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholderText(entityType)}
            disabled={!canAddMore}
            className={`flex-1 px-3 py-2 bg-black/40 backdrop-blur border ${
              error ? 'border-corporate-error' : 'border-corporate-borderPrimary'
            } rounded-lg text-corporate-textPrimary placeholder-corporate-textTertiary focus:outline-none focus:border-corporate-accentPrimary transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAddMore || !entityValue.trim()}
            className="px-4 py-2 bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-sm text-corporate-error">{error}</p>
        )}

        {/* Entity Count */}
        {!canAddMore && (
          <p className="mt-2 text-sm text-amber-400">
            Maximum {maxEntities} entities allowed
          </p>
        )}

        {/* Help Text */}
        {!error && canAddMore && (
          <p className="mt-2 text-xs text-corporate-textTertiary">
            {getHelpText(entityType)}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Get placeholder text based on entity type
 */
function getPlaceholderText(entityType: EntityType): string {
  const placeholders: Record<EntityType, string> = {
    [EntityType.EMAIL]: 'user@example.com',
    [EntityType.USER_ID]: 'user_12345',
    [EntityType.IP_ADDRESS]: '192.168.1.1',
    [EntityType.DEVICE_ID]: 'device_abc123',
    [EntityType.PHONE_NUMBER]: '+1234567890',
    [EntityType.TRANSACTION_ID]: 'txn_xyz789',
    [EntityType.ACCOUNT_ID]: 'acc_123456'
  };
  return placeholders[entityType];
}

/**
 * Get help text based on entity type
 */
function getHelpText(entityType: EntityType): string {
  const helpTexts: Record<EntityType, string> = {
    [EntityType.EMAIL]: 'Enter a valid email address',
    [EntityType.USER_ID]: 'Enter the user identifier',
    [EntityType.IP_ADDRESS]: 'Enter an IPv4 or IPv6 address',
    [EntityType.DEVICE_ID]: 'Enter the device identifier',
    [EntityType.PHONE_NUMBER]: 'Enter phone number with country code',
    [EntityType.TRANSACTION_ID]: 'Enter the transaction identifier',
    [EntityType.ACCOUNT_ID]: 'Enter the account identifier'
  };
  return helpTexts[entityType];
}

export default EntityInput;
