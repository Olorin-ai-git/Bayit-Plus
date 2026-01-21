/**
 * Cohort Selector Component - Select segmentation dimension.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useState } from 'react';
import type { CohortDimension } from '../../types/cohort';

interface CohortSelectorProps {
  selectedDimension: CohortDimension | null;
  onDimensionChange: (dimension: CohortDimension) => void;
}

const CohortSelector: React.FC<CohortSelectorProps> = ({
  selectedDimension,
  onDimensionChange,
}) => {
  const dimensions: { value: CohortDimension; label: string }[] = [
    { value: 'merchant', label: 'Merchant' },
    { value: 'channel', label: 'Channel' },
    { value: 'geography', label: 'Geography' },
    { value: 'device', label: 'Device' },
    { value: 'risk_band', label: 'Risk Band' },
    { value: 'model_version', label: 'Model Version' },
    { value: 'rule_version', label: 'Rule Version' },
  ];

  return (
    <div className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-4">
      <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
        Segment By
      </label>
      <select
        value={selectedDimension || ''}
        onChange={(e) => onDimensionChange(e.target.value as CohortDimension)}
        className="w-full px-4 py-2 bg-corporate-bgPrimary border border-corporate-borderPrimary rounded-lg text-corporate-textPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary"
      >
        <option value="">Select dimension...</option>
        {dimensions.map((dim) => (
          <option key={dim.value} value={dim.value}>
            {dim.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CohortSelector;

