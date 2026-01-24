/**
 * API Testing Helper for Olorin E2E Tests
 *
 * Provides utilities for:
 * - Creating test investigations
 * - Verifying API endpoints
 * - Cleaning up test data
 * - Managing authentication
 */

import { APIRequestContext } from '@playwright/test';

// TEST ONLY - Hardcoded fallback allowed for E2E testing helpers
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';

export interface TestInvestigation {
  investigation_id: string;
  lifecycle_stage: string;
  status: string;
  settings: Record<string, any>;
}

export class InvestigationAPIClient {
  constructor(private apiRequest: APIRequestContext) {}

  /**
   * Create a test investigation
   */
  async createInvestigation(
    overrides?: Partial<TestInvestigation>
  ): Promise<TestInvestigation> {
    const investigation: TestInvestigation = {
      investigation_id: `test-inv-${Date.now()}`,
      lifecycle_stage: 'IN_PROGRESS',
      status: 'IN_PROGRESS',
      settings: {
        name: 'Test Investigation',
        entities: [
          {
            entity_type: 'user_id',
            entity_value: 'test-user@example.com',
          },
        ],
        time_range: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        tools: [
          { tool_id: 'device_analysis' },
          { tool_id: 'location_analysis' },
        ],
        correlation_mode: 'OR',
        investigation_type: 'structured',
        investigation_mode: 'entity',
      },
      ...overrides,
    };

    const response = await this.apiRequest.post(
      `${API_BASE_URL}/api/v1/investigation-state/`,
      {
        data: investigation,
      }
    );

    if (!response.ok()) {
      throw new Error(`Failed to create investigation: ${response.status()} ${response.statusText()}`);
    }

    return response.json();
  }

  /**
   * Get investigation by ID
   */
  async getInvestigation(id: string): Promise<TestInvestigation> {
    const response = await this.apiRequest.get(
      `${API_BASE_URL}/api/v1/investigation-state/${id}`
    );

    if (!response.ok()) {
      throw new Error(`Failed to get investigation: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * List all investigations
   */
  async listInvestigations(filters?: Record<string, any>) {
    const params = new URLSearchParams({
      page: '1',
      page_size: '50',
      ...filters,
    });

    const response = await this.apiRequest.get(
      `${API_BASE_URL}/api/v1/investigation-state/?${params}`
    );

    if (!response.ok()) {
      throw new Error(`Failed to list investigations: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * Delete investigation
   */
  async deleteInvestigation(id: string): Promise<void> {
    const response = await this.apiRequest.delete(
      `${API_BASE_URL}/api/v1/investigation-state/${id}`
    );

    if (!response.ok()) {
      throw new Error(`Failed to delete investigation: ${response.status()}`);
    }
  }

  /**
   * Start investigation
   */
  async startInvestigation(id: string): Promise<TestInvestigation> {
    const response = await this.apiRequest.post(
      `${API_BASE_URL}/api/v1/investigation-state/${id}/start`
    );

    if (!response.ok()) {
      throw new Error(`Failed to start investigation: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * Complete investigation
   */
  async completeInvestigation(id: string, summary?: string): Promise<TestInvestigation> {
    const response = await this.apiRequest.post(
      `${API_BASE_URL}/api/v1/investigation-state/${id}/complete`,
      {
        data: { summary },
      }
    );

    if (!response.ok()) {
      throw new Error(`Failed to complete investigation: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * Get investigation statistics
   */
  async getStatistics(): Promise<Record<string, any>> {
    const response = await this.apiRequest.get(
      `${API_BASE_URL}/api/v1/investigation-state/statistics`
    );

    if (!response.ok()) {
      throw new Error(`Failed to get statistics: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * Verify API endpoint health
   */
  async verifyEndpoint(path: string, method: string = 'GET'): Promise<boolean> {
    try {
      const response = await this.apiRequest.fetch(
        `${API_BASE_URL}${path}`,
        { method }
      );
      return response.ok();
    } catch {
      return false;
    }
  }
}

export async function createTestInvestigations(
  apiRequest: APIRequestContext,
  count: number = 5
): Promise<TestInvestigation[]> {
  const client = new InvestigationAPIClient(apiRequest);
  const investigations: TestInvestigation[] = [];

  for (let i = 0; i < count; i++) {
    const status = i < 2 ? 'COMPLETED' : i < 4 ? 'IN_PROGRESS' : 'CREATED';
    const investigation = await client.createInvestigation({
      status,
      lifecycle_stage: status,
      settings: {
        name: `Test Investigation ${i + 1}`,
        entities: [
          {
            entity_type: 'user_id',
            entity_value: `test-user-${i}@example.com`,
          },
        ],
      },
    });
    investigations.push(investigation);
  }

  return investigations;
}

export async function cleanupTestInvestigations(
  apiRequest: APIRequestContext,
  investigations: TestInvestigation[]
): Promise<void> {
  const client = new InvestigationAPIClient(apiRequest);

  for (const inv of investigations) {
    try {
      await client.deleteInvestigation(inv.investigation_id);
    } catch (e) {
      console.warn(`Failed to cleanup investigation ${inv.investigation_id}:`, e);
    }
  }
}
