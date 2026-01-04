import { BaseApiService } from './BaseApiService';
import { env } from '../config/env.config';

export interface RetryInvestigationRequest {
  investigationId: string;
  reason?: string;
}

export interface RetryInvestigationResponse {
  success: boolean;
  investigationId: string;
  newExecutionId?: string;
}

export class InvestigationApiService extends BaseApiService {
  constructor() {
    super(env.api.baseUrl);
  }

  async retryInvestigation(request: RetryInvestigationRequest): Promise<RetryInvestigationResponse> {
    const { investigationId, ...body } = request;
    return this.post<RetryInvestigationResponse>(
      `/api/investigations/${investigationId}/retry`,
      body
    );
  }

  async getInvestigationStatus(investigationId: string): Promise<any> {
    return this.get(`/api/investigations/${investigationId}/status`);
  }

  async cancelInvestigation(investigationId: string): Promise<{ success: boolean }> {
    return this.post(`/api/investigations/${investigationId}/cancel`, {});
  }
}

export const investigationApiService = new InvestigationApiService();
