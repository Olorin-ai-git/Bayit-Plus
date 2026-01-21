/**
 * Monthly Analysis Results Display
 * Feature: monthly-frontend-trigger
 *
 * Shows complete results and metrics for a completed monthly analysis.
 * Includes aggregated metrics and daily breakdown.
 *
 * SYSTEM MANDATE Compliance:
 * - Tailwind CSS only
 * - No hardcoded values
 */

import React, { useMemo } from 'react';
import { MonthlyAnalysisResults as ResultsType, DailyResultSummary } from '../../types/monthlyAnalysis';

export interface MonthlyAnalysisResultsProps {
  /** Results data */
  results: ResultsType;
  /** Callback to download reports */
  onDownloadReport?: (reportType: string) => void;
}

/**
 * Metric card component
 */
const MetricCard: React.FC<{
  label: string;
  value: string | number;
  subValue?: string;
  colorClass?: string;
}> = ({ label, value, subValue, colorClass = 'text-white' }) => (
  <div className="bg-black/20 rounded-lg p-4">
    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
    {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
  </div>
);

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 */
function formatPercent(value?: number): string {
  if (value === undefined || value === null) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Results display component
 */
export const MonthlyAnalysisResultsDisplay: React.FC<MonthlyAnalysisResultsProps> = ({
  results,
  onDownloadReport,
}) => {
  const { metrics, dailyResults } = results;

  // Calculate daily totals for chart
  const dailyChartData = useMemo(() => {
    return dailyResults.map(day => ({
      day: day.day,
      investigations: day.investigationsCount,
      entities: day.entitiesAnalyzed,
      netValue: day.netValue,
    }));
  }, [dailyResults]);

  // Find best and worst days
  const bestDay = useMemo(() => {
    if (dailyResults.length === 0) return null;
    return dailyResults.reduce((best, day) =>
      day.netValue > best.netValue ? day : best
    );
  }, [dailyResults]);

  const worstDay = useMemo(() => {
    if (dailyResults.length === 0) return null;
    return dailyResults.reduce((worst, day) =>
      day.netValue < worst.netValue ? day : worst
    );
  }, [dailyResults]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {results.monthName} {results.year} Results
            </h2>
            <p className="text-sm text-gray-400">
              {results.dailyResults.length} days analyzed
            </p>
          </div>
          {onDownloadReport && (
            <div className="flex gap-2">
              <button
                onClick={() => onDownloadReport('html')}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400
                           rounded-lg transition-colors text-sm"
              >
                Download HTML
              </button>
              <button
                onClick={() => onDownloadReport('csv')}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400
                           rounded-lg transition-colors text-sm"
              >
                Download CSV
              </button>
            </div>
          )}
        </div>

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Total Net Value"
              value={formatCurrency(metrics.totalNetValue)}
              colorClass={metrics.totalNetValue >= 0 ? 'text-green-400' : 'text-red-400'}
            />
            <MetricCard
              label="Saved Fraud GMV"
              value={formatCurrency(metrics.totalSavedFraudGmv)}
              colorClass="text-green-400"
            />
            <MetricCard
              label="Lost Revenues"
              value={formatCurrency(metrics.totalLostRevenues)}
              colorClass="text-red-400"
            />
            <MetricCard
              label="ROI"
              value={metrics.roiPercentage ? `${metrics.roiPercentage.toFixed(1)}%` : 'N/A'}
              colorClass="text-purple-400"
            />
          </div>
        )}
      </div>

      {/* Classification Metrics */}
      {metrics && (
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Classification Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
              label="True Positives"
              value={metrics.totalTp.toLocaleString()}
              colorClass="text-green-400"
            />
            <MetricCard
              label="False Positives"
              value={metrics.totalFp.toLocaleString()}
              colorClass="text-red-400"
            />
            <MetricCard
              label="True Negatives"
              value={metrics.totalTn.toLocaleString()}
              colorClass="text-blue-400"
            />
            <MetricCard
              label="False Negatives"
              value={metrics.totalFn.toLocaleString()}
              colorClass="text-yellow-400"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              label="Precision"
              value={formatPercent(metrics.precision)}
              colorClass="text-white"
            />
            <MetricCard
              label="Recall"
              value={formatPercent(metrics.recall)}
              colorClass="text-white"
            />
            <MetricCard
              label="F1 Score"
              value={formatPercent(metrics.f1Score)}
              colorClass="text-white"
            />
          </div>
        </div>
      )}

      {/* Daily Breakdown */}
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Daily Breakdown</h3>

        {/* Best/Worst Days */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {bestDay && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-xs text-green-400 uppercase tracking-wide">Best Day</p>
              <p className="text-lg font-bold text-white">Day {bestDay.day}</p>
              <p className="text-sm text-green-400">{formatCurrency(bestDay.netValue)}</p>
            </div>
          )}
          {worstDay && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-xs text-red-400 uppercase tracking-wide">Worst Day</p>
              <p className="text-lg font-bold text-white">Day {worstDay.day}</p>
              <p className="text-sm text-red-400">{formatCurrency(worstDay.netValue)}</p>
            </div>
          )}
        </div>

        {/* Daily Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Day</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">Entities</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">Investigations</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">TP</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">FP</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">Net Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dailyResults.map((day) => (
                <tr key={day.day} className="hover:bg-white/5">
                  <td className="px-4 py-2 text-gray-300">
                    Day {day.day}
                    <span className="text-gray-500 text-xs ml-2">{day.date}</span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-300">
                    {day.entitiesAnalyzed.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-300">
                    {day.investigationsCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-green-400">{day.tp}</td>
                  <td className="px-4 py-2 text-right text-red-400">{day.fp}</td>
                  <td className={`px-4 py-2 text-right font-medium ${
                    day.netValue >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(day.netValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlyAnalysisResultsDisplay;
