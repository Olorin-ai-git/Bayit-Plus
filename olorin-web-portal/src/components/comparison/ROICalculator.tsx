/**
 * ROI Calculator Component
 *
 * Interactive calculator for enterprise decision-makers to estimate
 * potential savings and ROI from implementing Olorin.
 */

import React, { useCallback, useState } from 'react';
import { calculateROI, getROIConfig, ROIInputs, ROIResults } from '../../config/roi.config';

interface ROICalculatorProps {
  onCalculate?: (results: ROIResults) => void;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

export const ROICalculator: React.FC<ROICalculatorProps> = ({ onCalculate }) => {
  const [inputs, setInputs] = useState<ROIInputs>({
    annualTransactionVolume: 1000000,
    currentFraudRate: 0.5,
    averageTransactionValue: 100,
    currentReviewTeamSize: 5,
    currentFalsePositiveRate: 10,
  });

  const [results, setResults] = useState<ROIResults | null>(null);

  const handleInputChange = useCallback((field: keyof ROIInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCalculate = useCallback(() => {
    const config = getROIConfig();
    const calculatedResults = calculateROI(inputs, config);
    setResults(calculatedResults);
    onCalculate?.(calculatedResults);
  }, [inputs, onCalculate]);

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-corporate-textPrimary mb-6">Your Current Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-corporate-textSecondary mb-2">Annual Transaction Volume</label>
            <input
              type="number"
              value={inputs.annualTransactionVolume}
              onChange={(e) => handleInputChange('annualTransactionVolume', Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-corporate-textPrimary focus:outline-none focus:border-corporate-accentPrimary"
            />
            <span className="text-xs text-corporate-textMuted mt-1">
              {formatNumber(inputs.annualTransactionVolume)} transactions/year
            </span>
          </div>

          <div>
            <label className="block text-sm text-corporate-textSecondary mb-2">Current Fraud Rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={inputs.currentFraudRate}
              onChange={(e) => handleInputChange('currentFraudRate', Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-corporate-textPrimary focus:outline-none focus:border-corporate-accentPrimary"
            />
          </div>

          <div>
            <label className="block text-sm text-corporate-textSecondary mb-2">Average Transaction Value ($)</label>
            <input
              type="number"
              value={inputs.averageTransactionValue}
              onChange={(e) => handleInputChange('averageTransactionValue', Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-corporate-textPrimary focus:outline-none focus:border-corporate-accentPrimary"
            />
          </div>

          <div>
            <label className="block text-sm text-corporate-textSecondary mb-2">Review Team Size</label>
            <input
              type="number"
              min="1"
              value={inputs.currentReviewTeamSize}
              onChange={(e) => handleInputChange('currentReviewTeamSize', Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-corporate-textPrimary focus:outline-none focus:border-corporate-accentPrimary"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-corporate-textSecondary mb-2">
              Current False Positive Rate (%)
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={inputs.currentFalsePositiveRate}
              onChange={(e) => handleInputChange('currentFalsePositiveRate', Number(e.target.value))}
              className="w-full accent-corporate-accentPrimary"
            />
            <div className="flex justify-between text-sm text-corporate-textMuted mt-1">
              <span>1%</span>
              <span className="text-corporate-accentPrimary font-medium">{inputs.currentFalsePositiveRate}%</span>
              <span>50%</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleCalculate}
          className="mt-6 w-full px-6 py-3 bg-corporate-accentPrimary hover:bg-corporate-accentSecondary text-white font-medium rounded-lg transition-colors"
        >
          Calculate ROI
        </button>
      </div>

      {/* Results Section */}
      {results && (
        <div className="glass-card p-6 rounded-xl animate-fadeInUp">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-6">Projected Annual Savings</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-corporate-success/10 rounded-lg border border-corporate-success/30">
              <span className="text-2xl font-bold text-corporate-success">
                {formatCurrency(results.projectedFraudSavings)}
              </span>
              <p className="text-sm text-corporate-textMuted mt-1">Fraud Prevented</p>
            </div>

            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <span className="text-2xl font-bold text-blue-400">
                {formatCurrency(results.operationalCostReduction)}
              </span>
              <p className="text-sm text-corporate-textMuted mt-1">Operational Savings</p>
            </div>

            <div className="p-4 bg-corporate-warning/10 rounded-lg border border-corporate-warning/30">
              <span className="text-2xl font-bold text-corporate-warning">
                {formatCurrency(results.falsePositiveReduction)}
              </span>
              <p className="text-sm text-corporate-textMuted mt-1">FP Reduction Savings</p>
            </div>
          </div>

          <div className="p-6 bg-corporate-accentPrimary/10 rounded-lg border border-corporate-accentPrimary/30 text-center">
            <span className="text-4xl font-bold text-corporate-accentPrimary">
              {formatCurrency(results.totalAnnualSavings)}
            </span>
            <p className="text-corporate-textSecondary mt-2">Total Annual Savings</p>
            <div className="flex justify-center gap-8 mt-4 text-sm">
              <div>
                <span className="text-corporate-textPrimary font-medium">{results.roi.toFixed(0)}%</span>
                <span className="text-corporate-textMuted ml-1">ROI</span>
              </div>
              <div>
                <span className="text-corporate-textPrimary font-medium">
                  {results.paybackPeriodMonths.toFixed(1)}
                </span>
                <span className="text-corporate-textMuted ml-1">months payback</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ROICalculator;
