/**
 * Risk Score Progression Chart
 * Feature: 006-hybrid-graph-integration
 *
 * Plots risk score updates over time during investigation.
 * Shows risk level changes with color-coded visualization.
 */

import React, { useMemo } from 'react';

interface RiskScoreProgressionProps {
  currentRiskScore?: number; // 0-100
  historicalScores?: Array<{ timestamp: string; score: number }>;
  className?: string;
}

export function RiskScoreProgression({
  currentRiskScore,
  historicalScores = [],
  className = '',
}: RiskScoreProgressionProps) {
  const getRiskLevel = (score: number): { label: string; color: string; bg: string } => {
    if (score >= 80) return { label: 'Critical', color: 'text-corporate-error', bg: 'bg-red-900/30' };
    if (score >= 60) return { label: 'High', color: 'text-amber-400', bg: 'bg-amber-900/30' };
    if (score >= 40) return { label: 'Medium', color: 'text-cyan-400', bg: 'bg-cyan-900/30' };
    return { label: 'Low', color: 'text-gray-400', bg: 'bg-black/40 backdrop-blur' };
  };

  const chartData = useMemo(() => {
    if (historicalScores.length === 0 && currentRiskScore !== undefined) {
      return [{ timestamp: new Date().toISOString(), score: currentRiskScore }];
    }
    return historicalScores;
  }, [historicalScores, currentRiskScore]);

  // Score range calculated but not currently used in rendering
  // const maxScore = Math.max(...chartData.map((d) => d.score), 100);
  // const minScore = Math.min(...chartData.map((d) => d.score), 0);

  const formatTime = (isoTime: string): string => {
    try {
      const date = new Date(isoTime);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Invalid';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'rgb(248, 113, 113)'; // red-400
    if (score >= 60) return 'rgb(251, 191, 36)'; // amber-400
    if (score >= 40) return 'rgb(34, 211, 238)'; // cyan-400
    return 'rgb(156, 163, 175)'; // gray-400
  };

  if (currentRiskScore === undefined && chartData.length === 0) {
    return (
      <div className={`bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
          Risk Score Progression
        </h3>
        <p className="text-corporate-textSecondary text-center py-8">
          Risk score will appear once analysis begins...
        </p>
      </div>
    );
  }

  const currentLevel = currentRiskScore !== undefined ? getRiskLevel(currentRiskScore) : null;

  return (
    <div className={`bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-corporate-textPrimary">
          Risk Score Progression
        </h3>
        {currentLevel && (
          <div className="flex items-center space-x-3">
            <span className="text-sm text-corporate-textTertiary">Current Level:</span>
            <span className={`px-3 py-1 text-sm font-medium rounded ${currentLevel.bg} ${currentLevel.color}`}>
              {currentLevel.label}
            </span>
          </div>
        )}
      </div>

      {/* Current Risk Score Display */}
      {currentRiskScore !== undefined && (
        <div className="mb-6 p-4 bg-black/50 backdrop-blur rounded-lg">
          <div className="flex items-baseline justify-center space-x-2">
            <span className="text-5xl font-bold text-corporate-accentPrimary">
              {currentRiskScore.toFixed(0)}
            </span>
            <span className="text-xl text-corporate-textTertiary">/100</span>
          </div>
          <p className="text-center text-sm text-corporate-textSecondary mt-2">
            Current Risk Score
          </p>
        </div>
      )}

      {/* Simple Line Chart */}
      {chartData.length > 1 && (
        <div className="relative">
          <div className="h-48 relative bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40/30 rounded-lg p-4">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-corporate-textTertiary">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="ml-10 mr-2 h-full relative">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Risk level zones */}
                <rect x="0" y="0" width="100" height="20" fill="rgba(248, 113, 113, 0.1)" />
                <rect x="0" y="20" width="100" height="20" fill="rgba(251, 191, 36, 0.1)" />
                <rect x="0" y="40" width="100" height="20" fill="rgba(34, 211, 238, 0.1)" />
                <rect x="0" y="60" width="100" height="40" fill="rgba(156, 163, 175, 0.05)" />

                {/* Line path */}
                <polyline
                  points={chartData
                    .map((d, i) => {
                      const x = (i / (chartData.length - 1)) * 100;
                      const y = 100 - (d.score / 100) * 100;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke={getScoreColor(currentRiskScore || chartData[chartData.length - 1].score)}
                  strokeWidth="2"
                />

                {/* Data points */}
                {chartData.map((d, i) => {
                  const x = (i / (chartData.length - 1)) * 100;
                  const y = 100 - (d.score / 100) * 100;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="2"
                      fill={getScoreColor(d.score)}
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* X-axis labels */}
          <div className="ml-10 mt-2 flex justify-between text-xs text-gray-500">
            <span>{formatTime(chartData[0].timestamp)}</span>
            {chartData.length > 2 && <span>{formatTime(chartData[Math.floor(chartData.length / 2)].timestamp)}</span>}
            <span>{formatTime(chartData[chartData.length - 1].timestamp)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
