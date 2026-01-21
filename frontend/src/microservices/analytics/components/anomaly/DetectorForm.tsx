/**
 * DetectorForm Component - Form for creating/editing detectors
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React, { useState, useEffect } from 'react';
import { Panel } from '../common/Panel';
import { MetricSelector } from './MetricSelector';
import { CohortFields } from './CohortFields';
import { Slider } from '../common/Slider';
import type { Detector, DetectorType } from '../../types/anomaly';

export interface DetectorFormProps {
  detector?: Detector;
  onSubmit: (detector: Omit<Detector, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel?: () => void;
  className?: string;
  loading?: boolean;
}

export const DetectorForm: React.FC<DetectorFormProps> = ({
  detector,
  onSubmit,
  onCancel,
  className = '',
  loading = false,
}) => {
  const [name, setName] = useState(detector?.name || '');
  const [type, setType] = useState<DetectorType>(detector?.type || 'stl_mad');
  const [cohort, setCohort] = useState<Record<string, string>>(
    detector?.cohort_by?.reduce((acc, key) => ({ ...acc, [key]: '' }), {}) || {}
  );
  const [metrics, setMetrics] = useState<string[]>(detector?.metrics || ['tx_count']);
  const [k, setK] = useState(detector?.params?.k || 3.5);
  const [persistence, setPersistence] = useState(detector?.params?.persistence || 2);
  const [minSupport, setMinSupport] = useState(detector?.params?.min_support || 100);
  const [enabled, setEnabled] = useState(detector?.enabled ?? true);

  // Reset form to default values
  const resetForm = () => {
    setName('');
    setType('stl_mad');
    setCohort({});
    setMetrics(['tx_count']);
    setK(3.5);
    setPersistence(2);
    setMinSupport(100);
    setEnabled(true);
  };

  useEffect(() => {
    if (detector) {
      setName(detector.name);
      setType(detector.type);
      
      // Initialize cohort with values from detector params if available
      const cohortValues = detector.params?.cohort_values || {};
      const cohortInitial: Record<string, string> = {};
      
      // For each cohort dimension, use stored value or empty string
      if (detector.cohort_by) {
        for (const key of detector.cohort_by) {
          cohortInitial[key] = cohortValues[key] || '';
        }
      }
      
      setCohort(Object.keys(cohortInitial).length > 0 ? cohortInitial : {});
      setMetrics(detector.metrics || []);
      setK(detector.params?.k || 3.5);
      setPersistence(detector.params?.persistence || 2);
      setMinSupport(detector.params?.min_support || 100);
      setEnabled(detector.enabled);
    } else {
      // If no detector, reset to defaults
      resetForm();
    }
  }, [detector]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate name is not empty
    if (!name || !name.trim()) {
      // Browser will show native validation, but we can also prevent submission
      const nameInput = document.getElementById('detector-name') as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
        nameInput.reportValidity();
      }
      return;
    }
    
    // Filter out empty cohort values
    const cohortBy = Object.keys(cohort).filter((k) => cohort[k] && cohort[k].trim());
    
    onSubmit({
      name: name.trim(),
      type,
      cohort_by: cohortBy,
      metrics,
      params: {
        k,
        persistence,
        min_support: minSupport,
        ...detector?.params,
      },
      enabled,
    });
  };

  // Check if detector was derived from an investigation
  const investigationId = detector?.params?.derived_from_investigation_id;

  return (
    <Panel
      title={detector ? 'Edit Detector' : 'Create Detector'}
      variant="outlined"
      padding="lg"
      className={className}
    >
      {/* Banner showing investigation source */}
      {investigationId && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-blue-300">
              <span className="font-semibold">Derived from Investigation ID:</span>{' '}
              <span className="font-mono text-xs">{investigationId}</span>
            </p>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            className="block text-sm font-medium text-corporate-textPrimary mb-2"
            htmlFor="detector-name"
          >
            Name <span className="text-red-400">*</span>
          </label>
          <input
            id="detector-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={`w-full px-3 py-2 rounded-lg bg-corporate-bgSecondary border ${
              !name.trim() 
                ? 'border-red-500/50 focus:border-red-500' 
                : 'border-corporate-borderPrimary'
            } text-corporate-textPrimary focus:outline-none focus:ring-2 ${
              !name.trim()
                ? 'focus:ring-red-500/50'
                : 'focus:ring-corporate-accentPrimary'
            }`}
            aria-label="Detector name"
            aria-required="true"
          />
          {!name.trim() && (
            <p className="text-xs text-red-400 mt-1" role="alert">
              Detector name is required
            </p>
          )}
        </div>

        <div>
          <label
            className="block text-sm font-medium text-corporate-textPrimary mb-2"
            htmlFor="detector-type"
          >
            Type
          </label>
          <select
            id="detector-type"
            value={type}
            onChange={(e) => setType(e.target.value as DetectorType)}
            required
            className="w-full px-3 py-2 rounded-lg bg-corporate-bgSecondary border border-corporate-borderPrimary text-corporate-textPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary"
            aria-label="Detector type"
          >
            <option value="stl_mad">STL + MAD</option>
            <option value="cusum">CUSUM</option>
            <option value="isoforest">Isolation Forest</option>
          </select>
        </div>

        <MetricSelector
          value={metrics[0] || 'tx_count'}
          onChange={(metric) => setMetrics([metric])}
        />

        <CohortFields 
          cohort={cohort} 
          onChange={setCohort}
          availableFields={detector?.cohort_by || ['merchant_id', 'channel', 'geo']}
        />

        <Slider
          label="K (Threshold Multiplier)"
          value={k}
          min={1.0}
          max={10.0}
          step={0.1}
          onChange={setK}
          description="Higher values = fewer anomalies detected"
        />

        <Slider
          label="Persistence"
          value={persistence}
          min={1}
          max={10}
          step={1}
          onChange={setPersistence}
          description="Number of consecutive windows required"
        />

        <Slider
          label="Min Support (Data Points)"
          value={minSupport}
          min={10}
          max={500}
          step={10}
          onChange={setMinSupport}
          description="Minimum number of time windows required for detection. Lower values allow detection with less historical data."
        />

        <div className="flex items-center gap-2">
          <input
            id="detector-enabled"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-corporate-borderPrimary"
            aria-label="Enable detector"
          />
          <label
            htmlFor="detector-enabled"
            className="text-sm text-corporate-textPrimary cursor-pointer"
          >
            Enabled
          </label>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Save detector"
          >
            {loading ? 'Saving...' : detector ? 'Update' : 'Create'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-corporate-bgSecondary hover:bg-corporate-bgTertiary text-corporate-textPrimary border border-corporate-borderPrimary font-medium transition-colors"
              aria-label="Cancel"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </Panel>
  );
};

