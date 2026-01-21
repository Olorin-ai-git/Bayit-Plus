/**
 * Monthly Analysis Service
 * Feature: monthly-frontend-trigger
 *
 * API service for monthly analysis operations.
 * Follows BaseApiService patterns from investigationService.ts.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven API URL
 * - No hardcoded values
 * - Proper error handling
 */

import { BaseApiService } from '@shared/services/BaseApiService';
import { getRuntimeConfig } from '../../../shared/config/runtimeConfig';
import {
  BlindspotAnalysisResponse,
  BlindspotAnalysisTriggerParams,
  CancelRunResponse,
  MonthlyAnalysisHistoryResponse,
  MonthlyAnalysisReportsResponse,
  MonthlyAnalysisResults,
  MonthlyAnalysisStatus,
  MonthlyAnalysisTriggerParams,
} from '../types/monthlyAnalysis';

/**
 * Service for monthly analysis API operations
 */
export class MonthlyAnalysisService extends BaseApiService {
  private readonly baseEndpoint = '/api/v1/monthly-analysis';

  constructor(baseUrl?: string) {
    const apiUrl = baseUrl || getRuntimeConfig('REACT_APP_API_BASE_URL', { required: true });
    super(apiUrl);
  }

  /**
   * Trigger a new monthly analysis run
   *
   * @param params - Analysis configuration
   * @returns Status of the newly created run
   */
  async triggerAnalysis(params: MonthlyAnalysisTriggerParams): Promise<MonthlyAnalysisStatus> {
    const requestBody = {
      year: params.year,
      month: params.month,
      resume_from_day: params.resumeFromDay ?? 1,
      top_percentage: params.topPercentage,
      time_window_hours: params.timeWindowHours,
      include_blindspot_analysis: params.includeBlindspotAnalysis ?? true,
    };

    return this.post<MonthlyAnalysisStatus>(`${this.baseEndpoint}/trigger`, requestBody);
  }

  /**
   * Get status of current/most recent analysis run
   *
   * @returns Status of the current run
   */
  async getCurrentStatus(): Promise<MonthlyAnalysisStatus | null> {
    return this.get<MonthlyAnalysisStatus>(`${this.baseEndpoint}/status`);
  }

  /**
   * Get status of a specific run with ETag support
   *
   * @param runId - Run identifier
   * @param etag - Previous ETag for conditional request
   * @returns Status response with ETag
   */
  async getRunStatus(
    runId: string,
    etag?: string | null
  ): Promise<{ data: MonthlyAnalysisStatus | null; etag: string | null }> {
    const headers: Record<string, string> = {};
    if (etag) {
      headers['If-None-Match'] = etag;
    }

    const cacheBuster = `_t=${Date.now()}`;
    const url = `${this.baseEndpoint}/status/${runId}?${cacheBuster}`;

    const response = await this.fetch(url, {
      method: 'GET',
      headers,
    });

    const responseETag = response.headers.get('ETag') || response.headers.get('etag') || null;

    // Handle 304 Not Modified
    if (response.status === 304) {
      return { data: null, etag: etag || responseETag };
    }

    const { snakeToCamel } = await import('../../../shared/utils/caseConversion');
    const responseData = await response.json();
    const result = responseData.data || responseData;
    const status = snakeToCamel<MonthlyAnalysisStatus>(result);

    return { data: status, etag: responseETag };
  }

  /**
   * Get paginated history of analysis runs
   *
   * @param limit - Items per page
   * @param offset - Skip first N items
   * @param statusFilter - Filter by status
   * @returns Paginated history
   */
  async getHistory(
    limit: number = 20,
    offset: number = 0,
    statusFilter?: string
  ): Promise<MonthlyAnalysisHistoryResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (statusFilter) {
      params.append('status_filter', statusFilter);
    }

    return this.get<MonthlyAnalysisHistoryResponse>(
      `${this.baseEndpoint}/history?${params.toString()}`
    );
  }

  /**
   * Get full results for a completed run
   *
   * @param runId - Run identifier
   * @returns Full results with metrics and daily breakdown
   */
  async getResults(runId: string): Promise<MonthlyAnalysisResults | null> {
    return this.get<MonthlyAnalysisResults>(`${this.baseEndpoint}/results/${runId}`);
  }

  /**
   * Cancel a running analysis
   *
   * @param runId - Run to cancel
   * @returns Cancellation confirmation
   */
  async cancelRun(runId: string): Promise<CancelRunResponse> {
    return this.post<CancelRunResponse>(`${this.baseEndpoint}/cancel/${runId}`);
  }

  /**
   * Get available reports for a run
   *
   * @param runId - Run identifier
   * @returns Available report download links
   */
  async getReports(runId: string): Promise<MonthlyAnalysisReportsResponse | null> {
    return this.get<MonthlyAnalysisReportsResponse>(`${this.baseEndpoint}/reports/${runId}`);
  }

  /**
   * Get download URL for a report
   *
   * @param runId - Run identifier
   * @param reportType - Type of report (html, csv)
   * @returns Full download URL
   */
  getReportDownloadUrl(runId: string, reportType: string): string {
    return `${this.getBaseUrl()}${this.baseEndpoint}/reports/${runId}/download/${reportType}`;
  }

  /**
   * Run standalone blindspot analysis
   *
   * @param params - Analysis parameters
   * @returns Blindspot analysis results
   */
  async runBlindspotAnalysis(
    params: BlindspotAnalysisTriggerParams
  ): Promise<BlindspotAnalysisResponse> {
    const requestBody = {
      start_date: params.startDate,
      end_date: params.endDate,
      export_csv: params.exportCsv ?? true,
    };

    return this.post<BlindspotAnalysisResponse>(`${this.baseEndpoint}/blindspot`, requestBody);
  }
}

// Lazy singleton - only instantiate when first accessed
let serviceInstance: MonthlyAnalysisService | null = null;

function getInstance(): MonthlyAnalysisService {
  if (!serviceInstance) {
    serviceInstance = new MonthlyAnalysisService();
  }
  return serviceInstance;
}

/**
 * Monthly analysis service singleton with convenience methods
 */
export const monthlyAnalysisService = {
  get instance(): MonthlyAnalysisService {
    return getInstance();
  },

  triggerAnalysis: (...args: Parameters<MonthlyAnalysisService['triggerAnalysis']>) =>
    getInstance().triggerAnalysis(...args),

  getCurrentStatus: (...args: Parameters<MonthlyAnalysisService['getCurrentStatus']>) =>
    getInstance().getCurrentStatus(...args),

  getRunStatus: (...args: Parameters<MonthlyAnalysisService['getRunStatus']>) =>
    getInstance().getRunStatus(...args),

  getHistory: (...args: Parameters<MonthlyAnalysisService['getHistory']>) =>
    getInstance().getHistory(...args),

  getResults: (...args: Parameters<MonthlyAnalysisService['getResults']>) =>
    getInstance().getResults(...args),

  cancelRun: (...args: Parameters<MonthlyAnalysisService['cancelRun']>) =>
    getInstance().cancelRun(...args),

  getReports: (...args: Parameters<MonthlyAnalysisService['getReports']>) =>
    getInstance().getReports(...args),

  getReportDownloadUrl: (...args: Parameters<MonthlyAnalysisService['getReportDownloadUrl']>) =>
    getInstance().getReportDownloadUrl(...args),

  runBlindspotAnalysis: (...args: Parameters<MonthlyAnalysisService['runBlindspotAnalysis']>) =>
    getInstance().runBlindspotAnalysis(...args),
};
