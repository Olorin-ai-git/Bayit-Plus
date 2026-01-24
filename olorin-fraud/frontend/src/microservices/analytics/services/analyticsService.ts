/**
 * Analytics Service - API client for analytics microservice.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { BaseApiService } from '../../../shared/services/BaseApiService';
import type {
  AnalyticsDashboardResponse,
  AnalyticsFilter,
  ExportOptions,
} from '../types/analytics';
import type { FraudMetrics, PrecisionRecallResponse } from '../types/metrics';
import type { CohortAnalysisResponse } from '../types/cohort';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || (() => {
    throw new Error('CRITICAL: REACT_APP_API_BASE_URL is not set. Set it in your .env file. No fallback allowed for security.');
  })();

export class AnalyticsService extends BaseApiService {
  constructor() {
    super(`${API_BASE_URL}/api/v1/analytics`);
  }

  async getDashboard(
    filters?: AnalyticsFilter
  ): Promise<AnalyticsDashboardResponse> {
    const queryString = filters ? this.buildQueryString(filters) : '';
    return this.get<AnalyticsDashboardResponse>(
      `/dashboard${queryString ? `?${queryString}` : ''}`
    );
  }

  async getMetrics(
    startDate: string,
    endDate: string,
    includeLatency = true,
    includeThroughput = true
  ): Promise<FraudMetrics> {
    const params = {
      startDate,
      endDate,
      includeLatency: includeLatency.toString(),
      includeThroughput: includeThroughput.toString(),
    };
    return this.get<FraudMetrics>(`/metrics?${this.buildQueryString(params)}`);
  }

  async getPrecisionRecall(
    startDate: string,
    endDate: string
  ): Promise<PrecisionRecallResponse> {
    const params = { startDate, endDate };
    return this.get<PrecisionRecallResponse>(
      `/metrics/precision-recall?${this.buildQueryString(params)}`
    );
  }

  async getCohorts(
    dimension: string,
    startDate: string,
    endDate: string,
    minCount = 100
  ): Promise<CohortAnalysisResponse> {
    const params = { dimension, startDate, endDate, minCount };
    return this.get<CohortAnalysisResponse>(
      `/cohorts?${this.buildQueryString(params)}`
    );
  }

  async compareCohorts(
    cohortIds: string[],
    metrics?: string[]
  ): Promise<any> {
    const params: any = { cohortIds: cohortIds.join(',') };
    if (metrics) {
      params.metrics = metrics.join(',');
    }
    return this.get<any>(`/cohorts/compare?${this.buildQueryString(params)}`);
  }

  async exportData(options: ExportOptions): Promise<Blob> {
    const response = await this.fetch('/export', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    return response.blob();
  }

  async listExperiments(status?: string): Promise<any[]> {
    const params = status ? { status } : {};
    return this.get<any[]>(`/experiments${this.buildQueryString(params) ? `?${this.buildQueryString(params)}` : ''}`);
  }

  async createExperiment(experimentData: any): Promise<any> {
    return this.post<any>('/experiments', experimentData);
  }

  async getExperiment(experimentId: string): Promise<any> {
    return this.get<any>(`/experiments/${experimentId}`);
  }

  async updateExperiment(experimentId: string, updates: any): Promise<any> {
    return this.put<any>(`/experiments/${experimentId}`, updates);
  }

  async promoteExperiment(experimentId: string, variantId: string): Promise<any> {
    return this.post<any>(`/experiments/${experimentId}/promote?variantId=${variantId}`);
  }

  async getExperimentResults(
    experimentId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    const params = { startDate, endDate };
    return this.get<any>(`/experiments/${experimentId}/results?${this.buildQueryString(params)}`);
  }

  async checkExperimentGuardrails(experimentId: string): Promise<any[]> {
    return this.get<any[]>(`/experiments/${experimentId}/guardrails`);
  }

  async detectDrift(
    feature: string,
    referenceStart: string,
    referenceEnd: string,
    currentStart: string,
    currentEnd: string
  ): Promise<any> {
    const params = { feature, referenceStart, referenceEnd, currentStart, currentEnd };
    return this.get<any>(`/drift/detect?${this.buildQueryString(params)}`);
  }

  async checkDataQuality(startDate: string, endDate: string): Promise<any> {
    const params = { startDate, endDate };
    return this.get<any>(`/drift/quality?${this.buildQueryString(params)}`);
  }

  async listReplayScenarios(status?: string): Promise<any[]> {
    const params = status ? { status } : {};
    return this.get<any[]>(`/replay/scenarios${this.buildQueryString(params) ? `?${this.buildQueryString(params)}` : ''}`);
  }

  async createReplayScenario(scenarioData: any): Promise<any> {
    return this.post<any>('/replay/scenarios', scenarioData);
  }

  async getReplayScenario(scenarioId: string): Promise<any> {
    return this.get<any>(`/replay/scenarios/${scenarioId}`);
  }

  async runReplayScenario(scenarioId: string): Promise<any> {
    return this.post<any>(`/replay/scenarios/${scenarioId}/run`);
  }

  async getReplayScenarioResults(scenarioId: string): Promise<any> {
    return this.get<any>(`/replay/scenarios/${scenarioId}/results`);
  }

  async explainDecision(decisionId: string): Promise<any> {
    return this.get<any>(`/explain/${decisionId}`);
  }

  async getCohortTopDrivers(
    cohortId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    const params = { startDate, endDate };
    return this.get<any>(`/explain/cohort/${cohortId}/top-drivers?${this.buildQueryString(params)}`);
  }

  async getConfusionMatrix(
    startDate: string,
    endDate: string,
    timeBucket: string = 'day'
  ): Promise<any> {
    const params = { startDate, endDate, timeBucket };
    return this.get<any>(`/explain/confusion-matrix?${this.buildQueryString(params)}`);
  }

  async getPipelineHealth(): Promise<any> {
    return this.get<any>('/pipeline/health');
  }

  async checkPipelineFreshness(): Promise<any> {
    return this.get<any>('/pipeline/freshness');
  }

  async checkPipelineCompleteness(startDate: string, endDate: string): Promise<any> {
    const params = { startDate, endDate };
    return this.get<any>(`/pipeline/completeness?${this.buildQueryString(params)}`);
  }

  async checkSloViolations(): Promise<any> {
    return this.get<any>('/pipeline/slo-violations');
  }

  async getAuditLogs(params?: {
    startDate?: string;
    endDate?: string;
    actionType?: string;
    userId?: string;
    limit?: number;
  }): Promise<any> {
    const queryParams = params || {};
    return this.get<any>(`/audit/logs?${this.buildQueryString(queryParams)}`);
  }
}

export const analyticsService = new AnalyticsService();

