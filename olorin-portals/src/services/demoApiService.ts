/**
 * Demo API Service for Marketing Portal
 *
 * Handles communication with the backend demo API endpoints
 * for interactive marketing demonstrations.
 */

import { getDemoConfig } from '../config/demo.config';

export interface DemoScenario {
  id: string;
  type: string;
  title: string;
  description: string;
  risk_level: string;
  entity_type: string;
  showcase_agents: string[];
  display_data: Record<string, unknown>;
}

export interface DemoStartResponse {
  status: string;
  investigation_id: string;
  scenario: DemoScenario;
  rate_limit: RateLimitInfo;
}

export interface DemoStatusResponse {
  investigation_id: string;
  scenario_id: string;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'error';
  progress: number;
  current_agent: string | null;
  started_at: string;
  agent_results: Record<string, AgentResult>;
  error: string | null;
}

export interface AgentResult {
  status: string;
  risk_level: string;
  confidence: number;
  findings_count: number;
}

export interface RateLimitInfo {
  allowed?: boolean;
  remaining: number;
  reset_at: string;
  used?: number;
  retry_after_seconds?: number;
}

class DemoApiService {
  private baseUrl: string;

  constructor() {
    const config = getDemoConfig();
    this.baseUrl = config.apiBaseUrl;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new DemoRateLimitError(
          'Demo rate limit exceeded. Please try again later.',
          parseInt(retryAfter || '3600', 10)
        );
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }
    return response.json();
  }

  async getScenarios(): Promise<DemoScenario[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/demo/marketing/scenarios`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return this.handleResponse<DemoScenario[]>(response);
  }

  async startInvestigation(scenarioId: string): Promise<DemoStartResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/demo/marketing/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id: scenarioId }),
    });
    return this.handleResponse<DemoStartResponse>(response);
  }

  async getInvestigationStatus(investigationId: string): Promise<DemoStatusResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/demo/marketing/investigation/${investigationId}/status`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return this.handleResponse<DemoStatusResponse>(response);
  }

  async getRateLimitStatus(): Promise<RateLimitInfo> {
    const response = await fetch(`${this.baseUrl}/api/v1/demo/marketing/rate-limit`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return this.handleResponse<RateLimitInfo>(response);
  }
}

export class DemoRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'DemoRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Singleton instance
let demoApiServiceInstance: DemoApiService | null = null;

export const getDemoApiService = (): DemoApiService => {
  if (!demoApiServiceInstance) {
    demoApiServiceInstance = new DemoApiService();
  }
  return demoApiServiceInstance;
};

export default DemoApiService;
