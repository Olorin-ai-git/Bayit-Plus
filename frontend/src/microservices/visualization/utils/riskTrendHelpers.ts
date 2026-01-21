/**
 * Risk Trend Calculation Helpers
 * Task: T032 - Phase 3: Risk Visualization
 * Feature: 002-visualization-microservice
 *
 * Helper functions extracted from riskTrendCalculator for file size compliance.
 */

import type { RiskDataPoint } from './riskTrendCalculator';

/**
 * Calculate moving average of risk scores
 *
 * @param dataPoints - Array of risk data points
 * @param windowSize - Number of points to include in average
 * @returns Moving average value
 */
export function calculateMovingAverage(
  dataPoints: RiskDataPoint[],
  windowSize: number
): number | null {
  if (dataPoints.length === 0 || windowSize <= 0) {
    return null;
  }

  const window = dataPoints.slice(-windowSize);
  const sum = window.reduce((acc, point) => acc + point.riskScore, 0);
  return sum / window.length;
}

/**
 * Detect risk spikes (sudden increases above threshold)
 *
 * @param dataPoints - Array of risk data points
 * @param spikeThreshold - Minimum increase to consider a spike
 * @returns Array of spike timestamps
 */
export function detectRiskSpikes(
  dataPoints: RiskDataPoint[],
  spikeThreshold: number = 15
): number[] {
  const spikes: number[] = [];

  for (let i = 1; i < dataPoints.length; i++) {
    const increase = dataPoints[i].riskScore - dataPoints[i - 1].riskScore;
    if (increase >= spikeThreshold) {
      spikes.push(dataPoints[i].timestamp);
    }
  }

  return spikes;
}

/**
 * Calculate risk volatility (standard deviation)
 *
 * @param dataPoints - Array of risk data points
 * @returns Standard deviation of risk scores
 */
export function calculateRiskVolatility(dataPoints: RiskDataPoint[]): number | null {
  if (dataPoints.length < 2) {
    return null;
  }

  const scores = dataPoints.map((p) => p.riskScore);
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  const variance = scores.reduce((sum, score) => {
    const diff = score - mean;
    return sum + (diff * diff);
  }, 0) / scores.length;

  return Math.sqrt(variance);
}
