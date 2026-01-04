/**
 * FormField Component
 * Feature: 004-new-olorin-frontend
 *
 * Input wrapper with validation and consistent styling.
 * Supports text, email, number, and date input types.
 */

import React from 'react';

export type FormFieldType = 'text' | 'email' | 'number' | 'date' | 'datetime-local';

export interface FormFieldProps {
  /** Field label */
  label: string;
  /** Input type */
  type?: FormFieldType;
  /** Current value */
  value: string | number;
  /** Change handler */
  onChange: (value: string) => void;
  /** Optional placeholder */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Help text */
  helpText?: string;
  /** Min value (for number/date types) */
  min?: string | number;
  /** Max value (for number/date types) */
  max?: string | number;
}

/**
 * FormField component with validation
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  error,
  helpText,
  min,
  max
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-corporate-textPrimary">
        {label}
        {required && <span className="text-corporate-error ml-1">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        className={`
          px-3 py-2 rounded-lg border-2 transition-all
          bg-black/30 backdrop-blur text-corporate-textPrimary
          placeholder-corporate-textDisabled
          focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary
          ${
            error
              ? 'border-corporate-error focus:border-corporate-error'
              : 'border-corporate-borderPrimary focus:border-corporate-accentPrimary'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-corporate-borderSecondary'}
        `}
      />

      {error && (
        <span className="text-sm text-corporate-error flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </span>
      )}

      {helpText && !error && (
        <span className="text-sm text-corporate-textTertiary">{helpText}</span>
      )}
    </div>
  );
};
