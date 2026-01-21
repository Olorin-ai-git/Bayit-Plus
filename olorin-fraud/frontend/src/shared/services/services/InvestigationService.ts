/**
 * Investigation Service
 * Service for Investigation Wizard (Feature 004 - replaces legacy structured/manual investigation)
 */

import { BaseApiService } from '../BaseApiService';
import type { APIResponse } from '../types/service-types';

export interface Investigation {
  id: string;
  status: string;
  result?: any;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationRequest {
  entities: Array<{
    type: string;
    value: string;
  }>;
  timeRange?: {
    start: string;
    end: string;
  };
  tools?: string[];
  template?: string;
}

export class InvestigationService extends BaseApiService {
  /**
   * Create new investigation
   */
  async createInvestigation(
    request: InvestigationRequest
  ): Promise<Investigation> {
    return this.post<Investigation>('/investigations', request);
  }

  /**
   * Get investigation by ID
   */
  async getInvestigation(id: string): Promise<Investigation> {
    return this.get<Investigation>(`/investigations/${id}`);
  }

  /**
   * Get all investigations
   */
  async getInvestigations(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<APIResponse<Investigation[]>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.get<APIResponse<Investigation[]>>(
      `/investigations${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Update investigation
   */
  async updateInvestigation(
    id: string,
    updates: Partial<Investigation>
  ): Promise<Investigation> {
    return this.put<Investigation>(`/investigations/${id}`, updates);
  }

  /**
   * Delete investigation
   */
  async deleteInvestigation(id: string): Promise<void> {
    return this.delete(`/investigations/${id}`);
  }

  /**
   * Get investigation results
   */
  async getInvestigationResults(id: string): Promise<any> {
    return this.get<any>(`/investigations/${id}/results`);
  }
}
