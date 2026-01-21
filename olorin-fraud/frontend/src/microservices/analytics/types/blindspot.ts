/**
 * Blindspot Analysis Types - 2D Distribution Map for nSure vs Olorin
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

export type BlindspotColorMetric = 'fnRate' | 'fpRate' | 'precision' | 'recall';

export interface BlindspotTrainingInfo {
  olorinThreshold: number;
  promptVersion: string;
  llmFraudThreshold: number;
  analysisTimestamp: string;
}

export interface BlindspotCell {
  scoreBin: number;
  scoreBinLabel: string;
  gmvBin: string;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  fnRate: number;
  fpRate: number;
  precision: number;
  recall: number;
  f1: number;
  totalTransactions: number;
  fraudGmv: number;
  avgScore: number;
}

export interface BlindspotIdentified {
  scoreBin: string;
  gmvBin: string;
  fnCount: number;
  fnRate: number;
  recommendation: string;
}

export interface BlindspotSummary {
  totalTransactions: number;
  totalFraud: number;
  totalFraudGmv: number;
  overallPrecision: number;
  overallRecall: number;
  overallF1: number;
  highestFnCells: BlindspotIdentified[];
  lowestPrecisionCells: BlindspotIdentified[];
}

export interface BlindspotMatrix {
  scoreBins: number[];
  gmvBins: string[];
  cells: BlindspotCell[];
}

export interface BlindspotAnalysisResponse {
  status: 'success' | 'failed';
  trainingInfo: BlindspotTrainingInfo;
  matrix: BlindspotMatrix;
  blindspots: BlindspotIdentified[];
  summary: BlindspotSummary;
  error?: string;
}

export interface BlindspotHeatmapProps {
  data: BlindspotAnalysisResponse | null;
  colorMetric?: BlindspotColorMetric;
  onColorMetricChange?: (metric: BlindspotColorMetric) => void;
  onCellClick?: (cell: BlindspotCell) => void;
  loading?: boolean;
}

export interface BlindspotTooltipProps {
  cell: BlindspotCell;
  visible: boolean;
  x: number;
  y: number;
}
