/**
 * CohortFields Component - Input fields for cohort dimensions
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React, { useState, useEffect } from 'react';
import { AnomalyApiService } from '../../services/anomalyApi';

export interface CohortFieldsProps {
  cohort: Record<string, string>;
  onChange: (cohort: Record<string, string>) => void;
  availableFields?: string[];
  className?: string;
}

const DEFAULT_FIELDS = ['merchant_id', 'channel', 'geo'];

export const CohortFields: React.FC<CohortFieldsProps> = ({
  cohort,
  onChange,
  availableFields = DEFAULT_FIELDS,
  className = '',
}) => {
  const [sampleValues, setSampleValues] = useState<Record<string, string[]>>({});
  const [loadingSamples, setLoadingSamples] = useState<Record<string, boolean>>({});
  const apiService = new AnomalyApiService();

  // Fetch sample values for each field
  useEffect(() => {
    const fetchSamples = async () => {
      for (const field of availableFields) {
        if (!sampleValues[field] && !loadingSamples[field]) {
          setLoadingSamples(prev => ({ ...prev, [field]: true }));
          try {
            const result = await apiService.getSampleCohortValues(field, 10);
            // Only set if we got values - empty array means data unavailable
            if (result.values && result.values.length > 0) {
              setSampleValues(prev => ({ ...prev, [field]: result.values }));
            }
          } catch (error) {
            // Silently fail - sample values are optional
            // API now returns empty array instead of error, so this shouldn't happen
          } finally {
            setLoadingSamples(prev => ({ ...prev, [field]: false }));
          }
        }
      }
    };
    
    fetchSamples();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableFields.join(',')]); // Only re-fetch if fields change

  const handleFieldChange = (field: string, value: string) => {
    onChange({
      ...cohort,
      [field]: value,
    });
  };

  const handleRemoveField = (field: string) => {
    const newCohort = { ...cohort };
    delete newCohort[field];
    onChange(newCohort);
  };

  const handleSelectSample = (field: string, value: string) => {
    handleFieldChange(field, value);
  };

  // Count how many cohort fields have values
  const selectedCohortCount = Object.values(cohort).filter(v => v && v.trim()).length;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-corporate-textPrimary">
          Cohort Dimensions <span className="text-corporate-textTertiary">(at least one required)</span>
        </label>
        {selectedCohortCount === 0 && (
          <span className="text-xs text-red-400" role="alert">
            Required
          </span>
        )}
      </div>
      {availableFields.map((field) => {
        const samples = sampleValues[field] || [];
        const isLoading = loadingSamples[field];
        
        return (
          <div key={field} className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Enter ${field} value`}
                value={cohort[field] || ''}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                list={`${field}-suggestions`}
                className={`
                  flex-1 px-3 py-2 rounded-lg
                  bg-corporate-bgSecondary border ${
                    selectedCohortCount === 0 
                      ? 'border-red-500/50 focus:border-red-500' 
                      : 'border-corporate-borderPrimary'
                  }
                  text-corporate-textPrimary text-sm
                  focus:outline-none focus:ring-2 ${
                    selectedCohortCount === 0
                      ? 'focus:ring-red-500/50'
                      : 'focus:ring-corporate-accentPrimary'
                  }
                  placeholder:text-corporate-textTertiary
                `}
                aria-label={`${field} value`}
                aria-required="true"
              />
              {cohort[field] && (
                <button
                  type="button"
                  onClick={() => handleRemoveField(field)}
                  className="px-2 py-1 text-corporate-textSecondary hover:text-corporate-textPrimary transition-colors"
                  aria-label={`Remove ${field}`}
                >
                  ×
                </button>
              )}
            </div>
            
            {/* Sample values */}
            {samples.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-corporate-textTertiary self-center">Sample values:</span>
                {samples.slice(0, 5).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleSelectSample(field, value)}
                    className="px-2 py-1 text-xs rounded-md bg-corporate-bgTertiary hover:bg-corporate-accentPrimary/20 text-corporate-textSecondary hover:text-corporate-accentPrimary border border-corporate-borderPrimary/40 hover:border-corporate-accentPrimary/60 transition-all"
                    aria-label={`Use ${value} for ${field}`}
                  >
                    {value}
                  </button>
                ))}
                {samples.length > 5 && (
                  <span className="text-xs text-corporate-textTertiary self-center">
                    +{samples.length - 5} more
                  </span>
                )}
              </div>
            )}
            
            {isLoading && (
              <div className="text-xs text-corporate-textTertiary">
                Loading sample values...
              </div>
            )}
          </div>
        );
      })}
      {selectedCohortCount === 0 && (
        <p className="text-xs text-red-400 mt-1" role="alert">
          Please enter at least one cohort dimension value
        </p>
      )}
    </div>
  );
};

