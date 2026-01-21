/**
 * Financial Analysis Service
 * Feature: 025-financial-analysis-frontend
 *
 * API service for financial analysis dashboard data.
 */

import { BaseApiService } from '@shared/services/BaseApiService';
import { getRuntimeConfig } from '@shared/config/runtimeConfig';
import type { FinancialSummary, InvestigationFinancialAnalysis } from '../../investigation/types/financialMetrics';
import type { FinancialMetricsResponse, ApiFinancialSummary } from '../../investigation/types/financialApiTypes';
import { transformFinancialSummary, transformFinancialMetrics } from '../../investigation/types/financialApiTypes';

interface InvestigationListItem {
  id: string;
  entityType: string;
  entityValue: string;
  merchantName: string;
  status: string;
  savedFraudGmv: number;
  lostRevenues: number;
  netValue: number;
  precision: number | null;
  completedAt: string;
}

interface DashboardDataApiResponse {
  summary: ApiFinancialSummary;
  investigations: Array<{
    id: string;
    entity_type: string;
    entity_value: string;
    merchant_name: string;
    status: string;
    saved_fraud_gmv: number;
    lost_revenues: number;
    net_value: number;
    precision: number | null;
    completed_at: string;
  }>;
}

interface DashboardData {
  summary: FinancialSummary;
  investigations: InvestigationListItem[];
}

class FinancialAnalysisService extends BaseApiService {
  constructor(baseUrl?: string) {
    const apiUrl = baseUrl || getRuntimeConfig('REACT_APP_API_BASE_URL', { required: true });
    super(apiUrl);
  }

  async getDashboardData(): Promise<DashboardData> {
    const response = await this.get<DashboardDataApiResponse>('/api/v1/financial/dashboard');
    return {
      summary: transformFinancialSummary(response.summary),
      investigations: response.investigations.map((inv) => ({
        id: inv.id,
        entityType: inv.entity_type,
        entityValue: inv.entity_value,
        merchantName: inv.merchant_name,
        status: inv.status,
        savedFraudGmv: inv.saved_fraud_gmv,
        lostRevenues: inv.lost_revenues,
        netValue: inv.net_value,
        precision: inv.precision,
        completedAt: inv.completed_at,
      })),
    };
  }

  async getSummary(investigationIds?: string[]): Promise<FinancialSummary> {
    const params = investigationIds?.length ? { investigation_ids: investigationIds.join(',') } : {};
    const response = await this.get<ApiFinancialSummary>('/api/v1/financial/summary', params);
    return transformFinancialSummary(response);
  }

  async getInvestigationFinancials(investigationId: string): Promise<InvestigationFinancialAnalysis> {
    const response = await this.get<FinancialMetricsResponse>(`/api/v1/financial/${investigationId}/metrics`);
    return transformFinancialMetrics(response);
  }
}

let serviceInstance: FinancialAnalysisService | null = null;

export const financialAnalysisService = (() => {
  if (!serviceInstance) {
    serviceInstance = new FinancialAnalysisService();
  }
  return serviceInstance;
})();

export type { DashboardData, InvestigationListItem };
