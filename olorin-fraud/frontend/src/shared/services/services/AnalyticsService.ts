/**
 * Analytics Service
 * Service for Agent Analytics and monitoring
 */

import { BaseApiService } from '../BaseApiService';
import type { APIResponse } from '../types/service-types';

export interface AgentMetrics {
  agentId: string;
  executionTime: number;
  tokensUsed: number;
  successRate: number;
  timestamp: string;
}

export interface AgentLog {
  id: string;
  agentId: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class AnalyticsService extends BaseApiService {
  /**
   * Get agent metrics
   */
  async getAgentMetrics(params?: {
    agentId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<APIResponse<AgentMetrics[]>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.get<APIResponse<AgentMetrics[]>>(
      `/metrics${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Get agent logs
   */
  async getAgentLogs(params?: {
    agentId?: string;
    level?: string;
    limit?: number;
  }): Promise<APIResponse<AgentLog[]>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.get<APIResponse<AgentLog[]>>(
      `/logs${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Track agent execution
   */
  async trackExecution(data: {
    agentId: string;
    executionTime: number;
    tokensUsed: number;
    success: boolean;
  }): Promise<void> {
    return this.post<void>('/track', data);
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(): Promise<any> {
    return this.get<any>('/dashboard');
  }
}
