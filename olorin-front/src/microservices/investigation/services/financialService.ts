/**
 * Financial Service
 * Feature: 025-financial-analysis-frontend
 *
 * API service for financial metrics endpoints.
 */

import { BaseApiService } from '@shared/services/BaseApiService';
import { getRuntimeConfig } from '../../../shared/config/runtimeConfig';
import type {
  FinancialMetricsResponse,
  FinancialSummaryResponse,
} from '../types/financialApiTypes';

class FinancialService extends BaseApiService {
  private readonly baseEndpoint = '/api/v1/financial';

  constructor(baseUrl?: string) {
    const apiUrl = baseUrl || getRuntimeConfig('REACT_APP_API_BASE_URL', { required: true });
    super(apiUrl);
  }

  /**
   * Fetch financial metrics for a single investigation.
   * Only available for COMPLETED investigations.
   */
  async getMetrics(investigationId: string): Promise<FinancialMetricsResponse> {
    return this.get<FinancialMetricsResponse>(
      `${this.baseEndpoint}/${investigationId}/metrics`
    );
  }

  /**
   * Fetch aggregated financial summary for multiple investigations.
   */
  async getSummary(investigationIds: string[]): Promise<FinancialSummaryResponse> {
    const params = investigationIds
      .map((id) => `investigation_ids=${encodeURIComponent(id)}`)
      .join('&');
    return this.get<FinancialSummaryResponse>(`${this.baseEndpoint}/summary?${params}`);
  }
}

let financialServiceInstance: FinancialService | null = null;

function getInstance(): FinancialService {
  if (!financialServiceInstance) {
    financialServiceInstance = new FinancialService();
  }
  return financialServiceInstance;
}

export const financialService = {
  get instance(): FinancialService {
    return getInstance();
  },
  getMetrics: (investigationId: string) => getInstance().getMetrics(investigationId),
  getSummary: (investigationIds: string[]) => getInstance().getSummary(investigationIds),
};
