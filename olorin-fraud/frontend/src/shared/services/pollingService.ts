/**
 * PollingService - Adaptive Polling Client.
 * Feature: 005-polling-and-persistence
 *
 * SYSTEM MANDATE: Configuration-driven, ETag caching, rate limiting, error handling.
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import { getConfig } from '../config/env.config';
import { WizardState, InvestigationStatus, WizardStep } from '../types/wizardState';

// Load validated configuration
const envConfig = getConfig();
const config = {
  apiBaseUrl: envConfig.api.baseUrl,
  requestTimeoutMs: envConfig.api.requestTimeoutMs,
  // Note: AUTH_TOKEN not in schema - using process.env directly with validation
  authToken: process.env.REACT_APP_AUTH_TOKEN || ''
};

// Validate required configuration at module load
if (!config.authToken) {
  console.error('REACT_APP_AUTH_TOKEN not configured - polling service authentication will fail');
}

interface PollStateResponse {
  state: WizardState | null;
  recommendedIntervalMs: number;
}

interface ChangeEntry {
  version: number;
  action_type: string;
  changed_fields: string[];
  timestamp: string;
}

interface PollChangesResponse {
  changes: ChangeEntry[];
  currentSnapshot: WizardState | null;
}

interface ActiveInvestigation {
  investigation_id: string;
  status: InvestigationStatus;
  wizard_step: WizardStep;
  percent_complete: number;
  last_accessed: string;
}

interface PollActiveInvestigationsResponse {
  investigations: ActiveInvestigation[];
  total: number;
  limit: number;
  offset: number;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unavailable';
  recommended_intervals: {
    fast: number;
    normal: number;
    slow: number;
  };
  server_load: number;
}

class PollingService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${config.apiBaseUrl}/api/v1/polling`,
      timeout: config.requestTimeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.authToken}`
      }
    });
  }

  async pollState(investigationId: string, etag?: string, currentInterval?: number): Promise<PollStateResponse | null> {
    try {
      const headers: Record<string, string> = {};
      if (etag) headers['If-None-Match'] = etag;
      if (currentInterval) headers['X-Polling-Interval'] = currentInterval.toString();

      const response = await this.client.get<WizardState>(`/wizard-state/${investigationId}`, { headers });
      const recommendedInterval = parseInt(response.headers['x-recommended-interval'] || '2000');

      return { state: response.data, recommendedIntervalMs: recommendedInterval };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 304) return null;
      this.handleError(error, 'pollState');
      return null;
    }
  }

  async pollChanges(investigationId: string, sinceVersion: number, includeSnapshot: boolean = false): Promise<PollChangesResponse | null> {
    try {
      const response = await this.client.get<PollChangesResponse>(
        `/wizard-state/${investigationId}/changes`,
        { params: { since_version: sinceVersion, include_snapshot: includeSnapshot } }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 304) return null;
      this.handleError(error, 'pollChanges');
      return null;
    }
  }

  async pollActiveInvestigations(status?: InvestigationStatus, wizardStep?: WizardStep, limit: number = 20, offset: number = 0, etag?: string): Promise<PollActiveInvestigationsResponse | null> {
    try {
      const headers: Record<string, string> = etag ? { 'If-None-Match': etag } : {};
      const params: Record<string, any> = { limit, offset };
      if (status) params.status = status;
      if (wizardStep) params.wizard_step = wizardStep;

      const response = await this.client.get<PollActiveInvestigationsResponse>('/active-investigations', { headers, params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 304) return null;
      this.handleError(error, 'pollActiveInvestigations');
      return null;
    }
  }

  async getHealth(): Promise<HealthCheckResponse | null> {
    try {
      const response = await this.client.get<HealthCheckResponse>('/health', { headers: {} });
      return response.data;
    } catch (error) {
      this.handleError(error, 'getHealth');
      return null;
    }
  }

  private handleError(error: unknown, operation: string): void {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 429) {
        console.error(`[PollingService] ${operation}: Rate limit. Retry after ${error.response.headers['retry-after']}s`);
      } else if (status === 404) {
        console.error(`[PollingService] ${operation}: Not found`);
      } else {
        console.error(`[PollingService] ${operation}: ${error.message}`);
      }
    } else {
      console.error(`[PollingService] ${operation}:`, error);
    }
  }
}

// Export singleton instance
export const pollingService = new PollingService();
