/**
 * Validation Sidebar Component
 * Feature: 004-new-olorin-frontend
 *
 * Sticky sidebar showing validation status and "Start Investigation" button.
 * Uses Olorin purple corporate colors with real-time validation feedback.
 */

import React from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from './LoadingSpinner';

export interface ValidationItem {
  id: string;
  label: string;
  isValid: boolean;
  message?: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface ValidationSidebarProps {
  validationItems: ValidationItem[];
  canStartInvestigation: boolean;
  onStartInvestigation: () => void;
  isStarting?: boolean;
  className?: string;
}

/**
 * Validation sidebar with start button
 */
export const ValidationSidebar: React.FC<ValidationSidebarProps> = ({
  validationItems,
  canStartInvestigation,
  onStartInvestigation,
  isStarting = false,
  className = ''
}) => {
  const allValid = validationItems.every(item => item.isValid);
  const errorCount = validationItems.filter(item => !item.isValid && item.severity === 'error').length;
  const warningCount = validationItems.filter(item => item.severity === 'warning').length;

  return (
    <div className={`sticky top-4 space-y-4 ${className}`}>
      {/* Validation Status Card */}
      <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary/40 rounded-lg p-4 shadow-lg">
        <h3 className="text-lg font-semibold text-corporate-accentPrimary mb-4">
          Validation Status
        </h3>

        {/* Overall Status */}
        <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 border-2 ${
          allValid
            ? 'bg-corporate-success/10 border-corporate-success/50'
            : 'bg-corporate-error/10 border-corporate-error/50'
        }`}>
          {allValid ? (
            <CheckCircleIcon className="w-6 h-6 text-corporate-success flex-shrink-0" />
          ) : (
            <ExclamationTriangleIcon className="w-6 h-6 text-corporate-error flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              allValid ? 'text-corporate-success' : 'text-corporate-error'
            }`}>
              {allValid ? 'Ready to start' : 'Validation required'}
            </p>
            {!allValid && (errorCount > 0 || warningCount > 0) && (
              <p className="text-xs text-corporate-textTertiary mt-1">
                {errorCount > 0 && `${errorCount} error${errorCount !== 1 ? 's' : ''}`}
                {errorCount > 0 && warningCount > 0 && ', '}
                {warningCount > 0 && `${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        </div>

        {/* Validation Items */}
        <div className="space-y-2">
          {validationItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-black/50 transition-colors"
            >
              {/* Status Icon */}
              {item.isValid ? (
                <CheckCircleIcon className="w-5 h-5 text-corporate-success flex-shrink-0 mt-0.5" />
              ) : item.severity === 'error' ? (
                <XCircleIcon className="w-5 h-5 text-corporate-error flex-shrink-0 mt-0.5" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-corporate-warning flex-shrink-0 mt-0.5" />
              )}

              {/* Label and Message */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-corporate-textPrimary">
                  {item.label}
                </p>
                {item.message && (
                  <p className={`text-xs mt-1 ${
                    item.isValid
                      ? 'text-corporate-success'
                      : item.severity === 'error'
                      ? 'text-corporate-error'
                      : 'text-corporate-warning'
                  }`}>
                    {item.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Start Investigation Button */}
      <button
        type="button"
        onClick={onStartInvestigation}
        disabled={!canStartInvestigation || isStarting}
        className={`w-full px-6 py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-3 ${
          canStartInvestigation && !isStarting
            ? 'bg-corporate-accentPrimary hover:bg-corporate-accentPrimary/90 text-white hover:shadow-lg hover:shadow-corporate-accentPrimary/30 active:scale-95'
            : 'bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 text-corporate-textTertiary cursor-not-allowed opacity-50'
        }`}
      >
        {isStarting ? (
          <>
            <LoadingSpinner size="sm" />
            <span>Starting Investigation...</span>
          </>
        ) : (
          <span>Start Investigation</span>
        )}
      </button>

      {/* Help Text */}
      {!canStartInvestigation && !isStarting && (
        <p className="text-xs text-corporate-textTertiary text-center">
          Complete all required fields to start investigation
        </p>
      )}
    </div>
  );
};

export default ValidationSidebar;
