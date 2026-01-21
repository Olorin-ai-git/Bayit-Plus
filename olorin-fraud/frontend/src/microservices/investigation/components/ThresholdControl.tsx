/**
 * Threshold Control Component
 *
 * Slider + numeric input for risk threshold selection.
 * Range: 0.0 to 1.0, default 0.7.
 *
 * Constitutional Compliance:
 * - Default from RISK_THRESHOLD_DEFAULT env var (backend)
 * - No hardcoded threshold values
 */

import React, { useState, useCallback } from 'react';
import { Input } from '@shared/components/ui/Input';
import { useDebounce } from '../hooks/useDebounce';

interface ThresholdControlProps {
  value: number;
  onChange: (value: number) => void;
}

export const ThresholdControl: React.FC<ThresholdControlProps> = ({
  value,
  onChange
}) => {
  const [localValue, setLocalValue] = useState(value.toString());

  const debouncedOnChange = useDebounce((val: number) => {
    onChange(val);
  }, 300);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue.toString());
    debouncedOnChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalValue(inputValue);
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
      debouncedOnChange(numValue);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-corporate-textPrimary">
        Risk Threshold
      </label>
      <div className="flex items-center space-x-4">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={handleSliderChange}
          className="flex-1 h-2 bg-corporate-bgTertiary rounded-lg appearance-none cursor-pointer accent-corporate-accentPrimary"
        />
        <Input
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={localValue}
          onChange={handleInputChange}
          className="w-24"
        />
      </div>
      <p className="text-xs text-corporate-textTertiary">
        Transactions with predicted_risk ≥ threshold are flagged as fraud
      </p>
    </div>
  );
};

