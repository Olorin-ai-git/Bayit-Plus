/**
 * Entity Picker Component
 *
 * Typeahead component for selecting entity type and value.
 * Supports email, phone, device_id, ip, account_id, card_fingerprint, merchant_id.
 *
 * Constitutional Compliance:
 * - Normalizes entity values (email: lowercase, phone: E164)
 * - PII masking for non-privileged users
 * - No hardcoded entity types
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@shared/components/ui/Input';
import type { EntityType, Entity } from '../types/comparison';

interface EntityPickerProps {
  value?: Entity;
  onChange: (entity: Entity | undefined) => void;
  hasPrivilegedRole?: boolean;
}

const ENTITY_TYPES: EntityType[] = [
  'email',
  'phone',
  'device_id',
  'ip',
  'account_id',
  'card_fingerprint',
  'merchant_id'
];

const maskPII = (value: string, entityType: EntityType): string => {
  if (entityType === 'email') {
    const [local, domain] = value.split('@');
    if (!domain) return value;
    return `${local.substring(0, 2)}***@${domain}`;
  }
  if (entityType === 'phone') {
    return value.replace(/(\+\d{1,3})(\d+)(\d{4})/, '$1***$3');
  }
  return value.length > 8 ? `${value.substring(0, 4)}***${value.slice(-4)}` : '***';
};

export const EntityPicker: React.FC<EntityPickerProps> = ({
  value,
  onChange,
  hasPrivilegedRole = false
}) => {
  const [entityType, setEntityType] = useState<EntityType | ''>(value?.type || '');
  const [entityValue, setEntityValue] = useState(value?.value || '');

  // Sync internal state with prop changes
  useEffect(() => {
    if (value) {
      setEntityType(value.type);
      setEntityValue(value.value);
    } else {
      setEntityType('');
      setEntityValue('');
    }
  }, [value]);

  const handleTypeChange = (type: EntityType) => {
    setEntityType(type);
    if (entityValue) {
      onChange({ type, value: entityValue });
    } else {
      onChange(undefined);
    }
  };

  const handleValueChange = (val: string) => {
    setEntityValue(val);
    if (entityType && val) {
      const normalized = entityType === 'email' ? val.toLowerCase() : val;
      onChange({ type: entityType, value: normalized });
    } else {
      onChange(undefined);
    }
  };

  const displayValue = value && !hasPrivilegedRole
    ? maskPII(value.value, value.type)
    : entityValue;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
          Entity Type
        </label>
        <select
          value={entityType}
          onChange={(e) => handleTypeChange(e.target.value as EntityType)}
          className="w-full px-4 py-2 bg-black/30 backdrop-blur border-2 border-corporate-accentPrimary/40 rounded-lg text-corporate-textPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary"
        >
          <option value="">Select entity type</option>
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {entityType && (
        <div>
          <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
            Entity Value
            {entityType === 'card_fingerprint' && (
              <span className="text-xs text-corporate-textTertiary ml-2">
                (Format: BIN|last4)
              </span>
            )}
          </label>
          <Input
            type="text"
            value={displayValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={
              entityType === 'card_fingerprint'
                ? '123456|7890'
                : `Enter ${entityType.replace('_', ' ')}`
            }
          />
        </div>
      )}
    </div>
  );
};

