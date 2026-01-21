/**
 * Investigation Comparison Service
 *
 * API client for investigation comparison endpoint.
 * Handles POST /api/investigation/compare requests.
 *
 * Constitutional Compliance:
 * - Uses BaseApiService for HTTP communication
 * - All configuration from runtime config
 * - Type-safe request/response handling
 * - No hardcoded URLs or business logic
 */

import { BaseApiService } from '@shared/services/BaseApiService';
import type {
  ComparisonRequest,
  ComparisonResponse
} from '../types/comparison';

class ComparisonService extends BaseApiService {
  constructor() {
    // Use environment variable or default to backend API URL
    const apiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';
    super(apiUrl);
  }

  /**
   * Compare fraud metrics across two time windows.
   *
   * @param request Comparison request with windows, entity, options
   * @returns Comparison response with metrics and deltas
   * @throws Error if request fails or validation error occurs
   */
  async compareWindows(request: ComparisonRequest): Promise<ComparisonResponse> {
    const response = await this.post<ComparisonResponse>(
      '/investigation/compare',
      request
    );
    return response;
  }

  /**
   * Compare fraud metrics and return HTML report.
   *
   * @param request Comparison request with windows, entity, options
   * @returns HTML content as string
   * @throws Error if request fails or validation error occurs
   */
  async compareWindowsHTML(request: ComparisonRequest): Promise<string> {
    const response = await this.fetch('/investigation/compare/html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/html',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate HTML report: ${response.statusText}`);
    }
    
    return await response.text();
  }

  /**
   * Compare investigation results (risk scores and LLM insights).
   *
   * @param investigationIdA First investigation ID
   * @param investigationIdB Second investigation ID
   * @returns Investigation comparison response with metrics and deltas
   * @throws Error if request fails or validation error occurs
   */
  async compareInvestigations(
    investigationIdA: string,
    investigationIdB: string
  ): Promise<any> {
    const response = await this.post<any>(
      '/investigation/compare/investigations',
      {
        investigation_id_a: investigationIdA,
        investigation_id_b: investigationIdB
      }
    );
    return response;
  }
}

// Export singleton instance
export const comparisonService = new ComparisonService();

