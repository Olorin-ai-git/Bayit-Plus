/**
 * Slider Component - Range input with glassmorphic styling
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React from 'react';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  description?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
  className = '',
  disabled = false,
  description,
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          className="text-sm font-medium text-corporate-textPrimary"
          htmlFor={`slider-${label}`}
        >
          {label}
        </label>
        <span className="text-sm text-corporate-textSecondary font-mono">
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <input
        id={`slider-${label}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className={`
          w-full h-2 rounded-lg appearance-none cursor-pointer
          bg-corporate-bgTertiary
          accent-corporate-accentPrimary
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      {description && (
        <p className="text-xs text-corporate-textTertiary">{description}</p>
      )}
    </div>
  );
};

