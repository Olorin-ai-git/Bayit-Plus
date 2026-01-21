/**
 * EntitySelector Component
 * Feature: 004-new-olorin-frontend
 *
 * Enhanced dropdown selector for entity types with validation.
 * Includes detailed descriptions and validation pattern hints.
 * Used in Settings page for entity selection.
 */

import React, { useState } from 'react';
import { EntityType, ENTITY_TYPE_LABELS, ENTITY_VALIDATION_PATTERNS } from '@shared/types/entities.types';
import { ChevronDownIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export interface EntitySelectorProps {
  /** Current selected entity type */
  value: EntityType;
  /** Change handler */
  onChange: (value: EntityType) => void;
  /** Optional label */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Error message */
  error?: string;
}

interface EntityTypeOption {
  type: EntityType;
  label: string;
  description: string;
  icon: string;
  placeholder: string;
  pattern: string;
}

const ENTITY_TYPE_OPTIONS: EntityTypeOption[] = [
  {
    type: EntityType.EMAIL,
    label: 'Email Address',
    description: 'User email identifier',
    icon: '✉️',
    placeholder: 'user@example.com',
    pattern: 'Format: user@domain.com'
  },
  {
    type: EntityType.USER_ID,
    label: 'User ID',
    description: 'Unique user identifier',
    icon: '👤',
    placeholder: 'user_12345',
    pattern: 'Any user identifier format'
  },
  {
    type: EntityType.IP_ADDRESS,
    label: 'IP Address',
    description: 'IPv4 or IPv6 address',
    icon: '🌐',
    placeholder: '192.168.1.1',
    pattern: 'Format: xxx.xxx.xxx.xxx'
  },
  {
    type: EntityType.DEVICE_ID,
    label: 'Device ID',
    description: 'Unique device identifier',
    icon: '📱',
    placeholder: 'device_abc123',
    pattern: 'Any device ID format'
  },
  {
    type: EntityType.PHONE_NUMBER,
    label: 'Phone Number',
    description: 'Phone number with country code',
    icon: '☎️',
    placeholder: '+1234567890',
    pattern: 'Format: +1234567890 or (123) 456-7890'
  },
  {
    type: EntityType.TRANSACTION_ID,
    label: 'Transaction ID',
    description: 'Financial transaction identifier',
    icon: '💳',
    placeholder: 'txn_xyz789',
    pattern: 'Any transaction ID format'
  },
  {
    type: EntityType.ACCOUNT_ID,
    label: 'Account ID',
    description: 'Account or customer identifier',
    icon: '🏦',
    placeholder: 'acc_123456',
    pattern: 'Any account ID format'
  }
];

/**
 * EntitySelector component with enhanced UI and validation hints
 */
export const EntitySelector: React.FC<EntitySelectorProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = ENTITY_TYPE_OPTIONS.find(opt => opt.type === value);

  const handleSelect = (entityType: EntityType) => {
    onChange(entityType);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-corporate-textPrimary">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Main Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full px-4 py-3 rounded-lg border-2 transition-all duration-200
            bg-black/40 backdrop-blur text-left
            flex items-center justify-between gap-3
            ${
              error
                ? 'border-corporate-error/50 hover:border-corporate-error'
                : 'border-corporate-borderPrimary hover:border-corporate-accentSecondary'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isOpen ? 'border-corporate-accentPrimary bg-black/50' : ''}
          `}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedOption && (
              <>
                <span className="text-lg flex-shrink-0">{selectedOption.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-corporate-textPrimary truncate">
                    {selectedOption.label}
                  </div>
                  <div className="text-xs text-corporate-textTertiary truncate">
                    {selectedOption.description}
                  </div>
                </div>
              </>
            )}
          </div>
          <ChevronDownIcon
            className={`w-5 h-5 text-corporate-textSecondary flex-shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-black/50 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg shadow-2xl overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {ENTITY_TYPE_OPTIONS.map((option) => {
                const isSelected = value === option.type;
                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => handleSelect(option.type)}
                    className={`
                      w-full px-4 py-3 text-left transition-all duration-150 border-b border-corporate-borderPrimary/20
                      flex items-center gap-3 hover:bg-black/60
                      ${isSelected ? 'bg-corporate-accentPrimary/10 border-l-4 border-l-corporate-accentPrimary' : ''}
                    `}
                  >
                    {/* Icon */}
                    <span className="text-lg flex-shrink-0">{option.icon}</span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-corporate-textPrimary">
                          {option.label}
                        </h4>
                        {isSelected && (
                          <CheckCircleIcon className="w-4 h-4 text-corporate-accentSecondary flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-corporate-textTertiary mb-1">
                        {option.description}
                      </div>
                      <div className="text-xs text-corporate-textTertiary/70 bg-black/40 px-2 py-1 rounded w-fit">
                        📋 {option.pattern}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Validation Pattern Hint */}
      {selectedOption && !error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-corporate-accentSecondary/10 border border-corporate-accentSecondary/30 rounded-lg">
          <span className="text-xs font-medium text-corporate-accentSecondary mt-0.5">ℹ️</span>
          <span className="text-xs text-corporate-textSecondary">
            <span className="font-medium text-corporate-accentSecondary">Expected format:</span> {selectedOption.pattern}
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-corporate-error/20 border border-corporate-error/50 rounded-lg">
          <svg className="w-4 h-4 text-corporate-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs text-corporate-error">{error}</span>
        </div>
      )}

      {/* Example Value Hint */}
      {selectedOption && !error && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-corporate-textTertiary">Example:</span>
          <code className="text-xs bg-black/50 text-corporate-accentSecondary px-2 py-1 rounded font-mono border-2 border-corporate-borderPrimary/40/30">
            {selectedOption.placeholder}
          </code>
        </div>
      )}
    </div>
  );
};

export default EntitySelector;
