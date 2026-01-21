/**
 * Monthly Analysis Types
 * Feature: monthly-frontend-trigger
 *
 * TypeScript interfaces for monthly analysis API requests and responses.
 * Matches backend Pydantic schemas in monthly_analysis_api.py.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values
 * - Complete type definitions
 */

/**
 * Status of a monthly analysis run
 */
export type MonthlyAnalysisRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Request to trigger a new monthly analysis run
 */
export interface MonthlyAnalysisTriggerParams {
  /** Target year for analysis (2020-2030) */
  year: number;
  /** Target month (1-12) */
  month: number;
  /** Day to start/resume from (1-31) */
  resumeFromDay?: number;
  /** Override top percentage of entities to analyze (0.01-1.0) */
  topPercentage?: number;
  /** Override time window in hours (1-168) */
  timeWindowHours?: number;
  /** Run blindspot analysis after monthly flow */
  includeBlindspotAnalysis?: boolean;
}

/**
 * Progress metrics for an in-progress analysis
 */
export interface MonthlyAnalysisProgressMetrics {
  /** Current day being processed */
  currentDay: number;
  /** Total days to process */
  totalDays: number;
  /** Number of days completed */
  daysCompleted: number;
  /** Overall progress percentage (0-100) */
  progressPercentage: number;
  /** Total entities processed so far */
  entitiesProcessed: number;
  /** Total investigations created so far */
  investigationsCreated: number;
}

/**
 * Status response for a monthly analysis run
 */
export interface MonthlyAnalysisStatus {
  /** Unique identifier for this run */
  runId: string;
  /** Current run status */
  status: MonthlyAnalysisRunStatus;
  /** Analysis year */
  year: number;
  /** Analysis month (1-12) */
  month: number;
  /** Full month name (e.g., "January") */
  monthName: string;
  /** When the run started */
  startedAt: string;
  /** When status was last updated */
  updatedAt: string;
  /** When the run completed (if finished) */
  completedAt?: string;
  /** Progress metrics (if running) */
  progress?: MonthlyAnalysisProgressMetrics;
  /** Error message (if failed) */
  errorMessage?: string;
  /** User who triggered the run */
  triggeredBy?: string;
}

/**
 * Summary of a single day's analysis result
 */
export interface DailyResultSummary {
  /** Day of month */
  day: number;
  /** Full date string (YYYY-MM-DD) */
  date: string;
  /** Entities analyzed this day */
  entitiesAnalyzed: number;
  /** Investigations created */
  investigationsCount: number;
  /** True Positives */
  tp: number;
  /** False Positives */
  fp: number;
  /** True Negatives */
  tn: number;
  /** False Negatives */
  fn: number;
  /** Net value for the day */
  netValue: number;
  /** Processing duration in seconds */
  durationSeconds?: number;
}

/**
 * Aggregated metrics for a completed monthly analysis
 */
export interface MonthlyAnalysisMetrics {
  /** Total entities analyzed */
  totalEntities: number;
  /** Total investigations created */
  totalInvestigations: number;
  /** Total True Positives */
  totalTp: number;
  /** Total False Positives */
  totalFp: number;
  /** Total True Negatives */
  totalTn: number;
  /** Total False Negatives */
  totalFn: number;
  /** Precision rate (0-1) */
  precision?: number;
  /** Recall rate (0-1) */
  recall?: number;
  /** F1 Score (0-1) */
  f1Score?: number;
  /** Total saved fraud GMV */
  totalSavedFraudGmv: number;
  /** Total lost revenues */
  totalLostRevenues: number;
  /** Total net value */
  totalNetValue: number;
  /** ROI percentage */
  roiPercentage?: number;
}

/**
 * Full results of a completed monthly analysis run
 */
export interface MonthlyAnalysisResults {
  /** Unique run identifier */
  runId: string;
  /** Run status */
  status: MonthlyAnalysisRunStatus;
  /** Analysis year */
  year: number;
  /** Analysis month */
  month: number;
  /** Full month name */
  monthName: string;
  /** When the run started */
  startedAt: string;
  /** When the run completed */
  completedAt?: string;
  /** Aggregated metrics */
  metrics?: MonthlyAnalysisMetrics;
  /** Results for each day */
  dailyResults: DailyResultSummary[];
}

/**
 * Summary item for history listing
 */
export interface MonthlyAnalysisHistoryItem {
  /** Unique run identifier */
  runId: string;
  /** Analysis year */
  year: number;
  /** Analysis month */
  month: number;
  /** Full month name */
  monthName: string;
  /** Run status */
  status: MonthlyAnalysisRunStatus;
  /** When the run started */
  startedAt: string;
  /** When the run completed */
  completedAt?: string;
  /** Days completed */
  daysCompleted: number;
  /** Total days in month */
  totalDays: number;
  /** Total entities analyzed */
  totalEntities: number;
  /** User who triggered */
  triggeredBy?: string;
}

/**
 * Paginated history response
 */
export interface MonthlyAnalysisHistoryResponse {
  /** List of runs */
  runs: MonthlyAnalysisHistoryItem[];
  /** Total number of runs */
  total: number;
  /** Current page */
  page: number;
  /** Items per page */
  pageSize: number;
  /** More items available */
  hasMore: boolean;
}

/**
 * Link to a generated report
 */
export interface ReportLink {
  /** Type of report (html, csv, pdf) */
  reportType: string;
  /** Download URL */
  url: string;
  /** Suggested filename */
  filename: string;
  /** When report was generated */
  generatedAt: string;
  /** File size in bytes */
  sizeBytes?: number;
}

/**
 * Available reports for a completed run
 */
export interface MonthlyAnalysisReportsResponse {
  /** Run identifier */
  runId: string;
  /** Available reports */
  reports: ReportLink[];
}

/**
 * Request for standalone blindspot analysis
 */
export interface BlindspotAnalysisTriggerParams {
  /** Start date for analysis scope */
  startDate?: string;
  /** End date for analysis scope */
  endDate?: string;
  /** Export results to CSV */
  exportCsv?: boolean;
}

/**
 * Response from blindspot analysis
 */
export interface BlindspotAnalysisResponse {
  /** Analysis status */
  status: string;
  /** Number of blindspots found */
  blindspotsCount: number;
  /** Path to exported CSV */
  csvPath?: string;
  /** Analysis period description */
  analysisPeriod?: string;
}

/**
 * Response after cancelling a run
 */
export interface CancelRunResponse {
  /** Run identifier */
  runId: string;
  /** New status (cancelled) */
  status: MonthlyAnalysisRunStatus;
  /** Cancellation message */
  message: string;
  /** When the run was cancelled */
  cancelledAt: string;
}

/**
 * Terminal statuses (analysis complete)
 */
export const TERMINAL_STATUSES: MonthlyAnalysisRunStatus[] = [
  'completed',
  'failed',
  'cancelled',
];

/**
 * Check if status is terminal (analysis complete)
 */
export function isTerminalStatus(status: MonthlyAnalysisRunStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Get display color class for status
 */
export function getStatusColorClass(status: MonthlyAnalysisRunStatus): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-400';
    case 'running':
      return 'text-blue-400';
    case 'completed':
      return 'text-green-400';
    case 'failed':
      return 'text-red-400';
    case 'cancelled':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get display label for status
 */
export function getStatusLabel(status: MonthlyAnalysisRunStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}
