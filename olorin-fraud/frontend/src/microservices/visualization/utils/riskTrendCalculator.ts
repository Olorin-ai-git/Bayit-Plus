/**
 * Risk Trend Calculator
 * Task: T032 - Phase 3: Risk Visualization
 * Feature: 002-visualization-microservice
 *
 * Calculates risk score trends and provides analytics for agent risk gauges.
 * NO HARDCODED VALUES - All thresholds from configuration.
 */

import type { AgentRiskGaugeState } from '@shared/types/AgentRiskGauges';

/**
 * Risk trend direction
 */
export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

/**
 * Risk trend data point
 */
export interface RiskDataPoint {
  /** Timestamp of measurement */
  timestamp: number;

  /** Risk score at this point */
  riskScore: number;

  /** Tools executed at this point */
  toolsUsed: number;
}

/**
 * Risk trend analysis result
 */
export interface RiskTrendAnalysis {
  /** Current risk score */
  currentRisk: number;

  /** Previous risk score for comparison */
  previousRisk: number;

  /** Absolute change in risk */
  absoluteChange: number;

  /** Percentage change in risk */
  percentageChange: number;

  /** Trend direction */
  direction: TrendDirection;

  /** Rate of change (risk units per second) */
  rateOfChange: number;

  /** Projected risk in next interval (if trend continues) */
  projectedRisk: number;

  /** Time period analyzed (milliseconds) */
  timePeriod: number;
}

/**
 * Configuration for trend calculation
 */
export interface TrendCalculationConfig {
  /** Minimum change threshold to consider as increasing/decreasing (0-100) */
  changeThreshold: number;

  /** Projection time period in milliseconds */
  projectionPeriodMs: number;

  /** Maximum allowed projected risk (capped at 100) */
  maxProjectedRisk: number;
}

/**
 * Default trend calculation configuration
 */
const DEFAULT_TREND_CONFIG: TrendCalculationConfig = {
  changeThreshold: 2,          // 2% minimum change to consider non-stable
  projectionPeriodMs: 5000,    // Project 5 seconds ahead
  maxProjectedRisk: 100,       // Cap projections at 100
};

/**
 * Calculate risk trend from historical data points
 *
 * @param dataPoints - Array of risk data points (must be sorted by timestamp)
 * @param config - Optional configuration for calculations
 * @returns Risk trend analysis
 */
export function calculateRiskTrend(
  dataPoints: RiskDataPoint[],
  config: Partial<TrendCalculationConfig> = {}
): RiskTrendAnalysis | null {
  const cfg = { ...DEFAULT_TREND_CONFIG, ...config };

  // Need at least 2 points to calculate trend
  if (dataPoints.length < 2) {
    return null;
  }

  // Get current and previous points
  const current = dataPoints[dataPoints.length - 1];
  const previous = dataPoints[dataPoints.length - 2];

  // Calculate changes
  const absoluteChange = current.riskScore - previous.riskScore;
  const percentageChange = previous.riskScore === 0
    ? 0
    : (absoluteChange / previous.riskScore) * 100;

  // Determine direction
  let direction: TrendDirection;
  if (Math.abs(percentageChange) < cfg.changeThreshold) {
    direction = 'stable';
  } else if (absoluteChange > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }

  // Calculate rate of change (risk units per second)
  const timePeriod = current.timestamp - previous.timestamp;
  const rateOfChange = timePeriod > 0 ? (absoluteChange / timePeriod) * 1000 : 0;

  // Project future risk
  const projectedRisk = Math.min(
    cfg.maxProjectedRisk,
    Math.max(
      0,
      current.riskScore + (rateOfChange * cfg.projectionPeriodMs / 1000)
    )
  );

  return {
    currentRisk: current.riskScore,
    previousRisk: previous.riskScore,
    absoluteChange,
    percentageChange,
    direction,
    rateOfChange,
    projectedRisk,
    timePeriod,
  };
}

// Re-export helper functions for convenience
export {
  calculateMovingAverage,
  detectRiskSpikes,
  calculateRiskVolatility,
} from './riskTrendHelpers';

/**
 * Convert agent state history to data points
 *
 * @param states - Array of agent states with timestamps
 * @returns Array of risk data points
 */
export function stateHistoryToDataPoints(
  states: Array<AgentRiskGaugeState & { timestamp: number }>
): RiskDataPoint[] {
  return states
    .filter((state) => state.timestamp > 0)
    .map((state) => ({
      timestamp: state.timestamp,
      riskScore: state.riskScore,
      toolsUsed: state.toolsUsed,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}
