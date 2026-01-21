/**
 * Investigation Mode Switch Component
 * Feature: 004-new-olorin-frontend
 *
 * Toggle switch for selecting investigation mode:
 * - Specific Entity Selection: User manually selects entities to investigate
 * - Risk-Based Entity Selection: System automatically selects high-risk entities
 * Uses Olorin purple corporate colors with clear visual distinction.
 */

import React from 'react';
import { UserCircleIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

export type InvestigationMode = 'specific' | 'risk-based';

export interface InvestigationModeSwitchProps {
  mode: InvestigationMode;
  onChange: (mode: InvestigationMode) => void;
  className?: string;
}

/**
 * Investigation Mode Switch with clear visual indicators
 */
export const InvestigationModeSwitch: React.FC<InvestigationModeSwitchProps> = ({
  mode,
  onChange,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
        Investigation Mode
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Specific Entity Selection */}
        <button
          type="button"
          onClick={() => onChange('specific')}
          className={`
            flex items-start gap-3 p-4 rounded-lg border-2 transition-all duration-200
            ${
              mode === 'specific'
                ? 'border-corporate-accentPrimary bg-corporate-accentPrimary/10 shadow-lg shadow-corporate-accentPrimary/20'
                : 'border-corporate-borderPrimary bg-black/40 backdrop-blur hover:border-corporate-borderSecondary hover:bg-black/50'
            }
          `}
        >
          <UserCircleIcon
            className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
              mode === 'specific' ? 'text-corporate-accentPrimary' : 'text-corporate-textTertiary'
            }`}
          />
          <div className="flex-1 text-left">
            <h4
              className={`text-sm font-semibold mb-1 ${
                mode === 'specific' ? 'text-corporate-accentPrimary' : 'text-corporate-textPrimary'
              }`}
            >
              Specific Entity Selection
            </h4>
            <p className="text-xs text-corporate-textSecondary">
              Manually select entities to investigate based on your criteria
            </p>
          </div>
          {mode === 'specific' && (
            <div className="flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-corporate-accentPrimary flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
          )}
        </button>

        {/* Risk-Based Entity Selection */}
        <button
          type="button"
          onClick={() => onChange('risk-based')}
          className={`
            flex items-start gap-3 p-4 rounded-lg border-2 transition-all duration-200
            ${
              mode === 'risk-based'
                ? 'border-corporate-accentPrimary bg-corporate-accentPrimary/10 shadow-lg shadow-corporate-accentPrimary/20'
                : 'border-corporate-borderPrimary bg-black/40 backdrop-blur hover:border-corporate-borderSecondary hover:bg-black/50'
            }
          `}
        >
          <ShieldExclamationIcon
            className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
              mode === 'risk-based' ? 'text-corporate-accentPrimary' : 'text-corporate-textTertiary'
            }`}
          />
          <div className="flex-1 text-left">
            <h4
              className={`text-sm font-semibold mb-1 ${
                mode === 'risk-based' ? 'text-corporate-accentPrimary' : 'text-corporate-textPrimary'
              }`}
            >
              Risk-Based Entity Selection
            </h4>
            <p className="text-xs text-corporate-textSecondary">
              Automatically investigate entities flagged as high-risk by the system
            </p>
          </div>
          {mode === 'risk-based' && (
            <div className="flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-corporate-accentPrimary flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Help Text */}
      <p className="text-xs text-corporate-textTertiary">
        {mode === 'specific'
          ? 'You will manually add entities using the entity input below'
          : 'The system will automatically identify and investigate high-risk entities'}
      </p>
    </div>
  );
};

export default InvestigationModeSwitch;
