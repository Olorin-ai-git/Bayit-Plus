/**
 * Hybrid Graph Investigation Service
 * Feature: 006-hybrid-graph-integration
 *
 * Service for hybrid graph investigation operations.
 * Handles creation, status polling, and results retrieval.
 */

import { BaseApiService } from '@shared/services/BaseApiService';
import type {
  InvestigationConfig,
  InvestigationStatus,
  InvestigationResults,
} from '../types/hybridGraphTypes';
import { getHybridGraphConfig } from '../../../shared/config/hybridGraphConfig';

export interface CreateInvestigationResponse {
  investigation_id: string;
}

export interface InvestigationError {
  statusCode: number;
  message: string;
  detail?: string;
}

export class HybridGraphInvestigationService extends BaseApiService {
  private readonly config: ReturnType<typeof getHybridGraphConfig>;

  constructor(baseUrl?: string) {
    // Load config first to get API base URL
    const hybridConfig = getHybridGraphConfig();
    super(baseUrl || hybridConfig.apiBaseUrl);
    this.config = hybridConfig;
  }

  /**
   * Create a new hybrid graph investigation
   */
  async createInvestigation(config: InvestigationConfig): Promise<string> {
    if (!this.config.features.enableHybridGraph) {
      throw new Error('Hybrid graph investigations are disabled');
    }

    try {
      const response = await this.post<CreateInvestigationResponse>(
        this.config.api.endpoints.create,
        config
      );

      if (!response.investigation_id) {
        throw new Error('Invalid response: missing investigation_id');
      }

      return response.investigation_id;
    } catch (error) {
      throw this.handleError(error, 'Failed to create investigation');
    }
  }

  /**
   * Get investigation status for polling
   */
  async getInvestigationStatus(investigationId: string): Promise<InvestigationStatus> {
    if (!investigationId) {
      throw new Error('Investigation ID is required');
    }

    try {
      const endpoint = this.config.api.endpoints.status.replace(
        '{investigation_id}',
        investigationId
      );

      return await this.get<InvestigationStatus>(endpoint);
    } catch (error) {
      throw this.handleError(error, `Failed to get status for investigation ${investigationId}`);
    }
  }

  /**
   * Get final investigation results
   */
  async getInvestigationResults(investigationId: string): Promise<InvestigationResults> {
    if (!investigationId) {
      throw new Error('Investigation ID is required');
    }

    try {
      const endpoint = this.config.api.endpoints.results.replace(
        '{investigation_id}',
        investigationId
      );

      return await this.get<InvestigationResults>(endpoint);
    } catch (error) {
      throw this.handleError(error, `Failed to get results for investigation ${investigationId}`);
    }
  }

  /**
   * Export investigation results in specified format
   */
  async exportInvestigation(
    investigationId: string,
    format: 'pdf' | 'json' | 'csv' = 'pdf'
  ): Promise<Blob> {
    if (!investigationId) {
      throw new Error('Investigation ID is required');
    }

    try {
      const endpoint = `${this.config.api.endpoints.results.replace(
        '{investigation_id}',
        investigationId
      )}/export?format=${format}`;

      const response = await this.fetch(endpoint, {
        method: 'GET',
        headers: {
          ...this.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export failed: ${response.statusText} - ${errorText}`);
      }

      return response.blob();
    } catch (error) {
      throw this.handleError(error, `Failed to export investigation ${investigationId}`);
    }
  }

  /**
   * Check if hybrid graph feature is enabled
   */
  isFeatureEnabled(): boolean {
    return this.config.features.enableHybridGraph;
  }

  /**
   * Get hybrid graph configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Enhanced error handling with investigation-specific context
   */
  private handleError(error: unknown, context: string): Error {
    if (error instanceof Error) {
      return new Error(`${context}: ${error.message}`);
    }

    if (typeof error === 'object' && error !== null) {
      const investigationError = error as InvestigationError;
      if (investigationError.detail) {
        return new Error(`${context}: ${investigationError.detail}`);
      }
      if (investigationError.message) {
        return new Error(`${context}: ${investigationError.message}`);
      }
    }

    return new Error(`${context}: Unknown error occurred`);
  }
}

/**
 * Singleton instance for convenient access
 */
export const hybridGraphInvestigationService = new HybridGraphInvestigationService();

/**
 * Type exports
 */
export type { InvestigationConfig, InvestigationStatus, InvestigationResults };
