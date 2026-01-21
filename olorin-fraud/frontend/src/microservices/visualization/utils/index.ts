/**
 * Visualization Utilities - Barrel Export
 * Task: T034 - Phase 3: Risk Visualization
 * Feature: 002-visualization-microservice
 *
 * Centralized exports for all visualization utilities.
 */

// Risk trend calculation
export {
  calculateRiskTrend,
  stateHistoryToDataPoints,
} from './riskTrendCalculator';
export type {
  TrendDirection,
  RiskDataPoint,
  RiskTrendAnalysis,
  TrendCalculationConfig,
} from './riskTrendCalculator';

// Risk trend helpers
export {
  calculateMovingAverage,
  detectRiskSpikes,
  calculateRiskVolatility,
} from './riskTrendHelpers';

// Risk gauge export functionality
export {
  exportGaugeAsImage,
  exportGaugeDataAsJSON,
  exportGaugeDataAsCSV,
} from './riskGaugeExporter';
export type { ExportFormat, ExportOptions } from './riskGaugeExporter';

// Risk gauge export helpers
export {
  exportSVG,
  exportPNG,
  buildFilename,
  downloadBlob,
} from './riskGaugeExportHelpers';

// HyperGauge helpers
// Note: valueToAngle, polarToCartesian, arcPath are exported via components/risk
// to avoid duplicate exports. Only export sanitizeNumeric here.
export {
  sanitizeNumeric,
} from './hyperGaugeHelpers';

// Color palettes
export {
  getColorPalette,
  getDefaultColorPalette,
  getColorBySeverity,
  getColorByCategory,
  getColorByIndex,
  getSequentialGradient,
  getDivergingScale,
  hexToRgb,
  withOpacity,
} from './colorPalettes';
export type { PaletteName, RiskSeverity } from './colorPalettes';
