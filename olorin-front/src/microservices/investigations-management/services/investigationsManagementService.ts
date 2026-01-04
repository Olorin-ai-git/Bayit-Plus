/**
 * API Service for Investigations Management
 * Integrates with backend /api/v1/investigations endpoints
 */

import axios from 'axios';
import { getConfig } from '@shared/config/env.config';
import { createAxiosErrorInterceptor } from '@shared/utils/axiosErrorHandler';
import { 
  Investigation, 
  CreateInvestigationRequest, 
  UpdateInvestigationRequest 
} from '../types/investigations';

// Get API base URL from shared config (handles browser environment)
const config = getConfig();
const API_BASE_URL = `${config.api.baseUrl}/api/v1`;

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling and toast notifications
apiClient.interceptors.response.use(
  (response) => response,
  createAxiosErrorInterceptor(true)
);

// Request deduplication: prevent multiple simultaneous identical requests
const pendingRequests = new Map<string, Promise<any>>();

const getRequestKey = (method: string, url: string, params?: any): string => {
  const paramsStr = params ? JSON.stringify(params) : '';
  return `${method}:${url}:${paramsStr}`;
};

export const investigationsManagementService = {
  /**
   * List all investigations with optional filtering
   * Uses request deduplication to prevent multiple simultaneous identical requests
   */
  async list(filters?: { status?: string; search?: string; owner?: string }): Promise<Investigation[]> {
    const requestKey = getRequestKey('GET', '/investigations', filters);
    
    // If there's already a pending request with the same parameters, return it
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey)!;
    }
    
    // Create new request
    const requestPromise = (async () => {
      try {
        const response = await apiClient.get('/investigations', {
          params: filters
        });
        const data = Array.isArray(response.data) ? response.data : [];
        
        // Transform API response to match frontend Investigation interface
        const transformedData = data.map((inv: any) => {
          // Map status from backend format to frontend format (if needed)
          const statusMap: Record<string, string> = {
            'IN_PROGRESS': 'in-progress',
            'COMPLETED': 'completed',
            'FAILED': 'failed',
            'ERROR': 'failed',
            'CANCELLED': 'archived',
            'CREATED': 'pending',
            'SETTINGS': 'pending'
          };
          const mappedStatus = statusMap[inv.status] || inv.status?.toLowerCase() || 'pending';

          return {
            id: inv.id,
            name: inv.name ?? undefined, // NO FALLBACK - use undefined if null/undefined
            owner: inv.owner ?? undefined, // NO FALLBACK - use undefined if null/undefined
            description: inv.description ?? undefined, // NO FALLBACK - use undefined if null/undefined
            status: mappedStatus as any,
            created: inv.created ?? undefined, // NO FALLBACK - use undefined if null/undefined
            updated: inv.updated ?? undefined, // NO FALLBACK - use undefined if null/undefined
            riskModel: inv.riskModel ?? undefined, // NO FALLBACK - use undefined if null/undefined
            sources: inv.sources ?? undefined, // NO FALLBACK - use undefined if null/undefined (not empty array)
            tools: inv.tools ?? undefined, // NO FALLBACK - use undefined if null/undefined (not empty array)
            from: inv.from_date ?? inv.from ?? undefined, // Map from_date to from, NO FALLBACK
            to: inv.to_date ?? inv.to ?? undefined, // Map to_date to to, NO FALLBACK
            progress: inv.progress ?? undefined, // Use nullish coalescing - 0 is valid, but null/undefined should be undefined
            phases: inv.phases ?? undefined, // NO FALLBACK - use undefined if null/undefined
            entity_id: inv.entity_id ?? undefined,
            entity_type: inv.entity_type ?? undefined,
            overall_risk_score: inv.overall_risk_score ?? undefined,
            // Domain-specific fields
            device_risk_score: inv.device_risk_score ?? undefined,
            location_risk_score: inv.location_risk_score ?? undefined,
            network_risk_score: inv.network_risk_score ?? undefined,
            logs_risk_score: inv.logs_risk_score ?? undefined,
            device_llm_thoughts: inv.device_llm_thoughts ?? undefined,
            location_llm_thoughts: inv.location_llm_thoughts ?? undefined,
            network_llm_thoughts: inv.network_llm_thoughts ?? undefined,
            logs_llm_thoughts: inv.logs_llm_thoughts ?? undefined,
          };
        });
        
        // Debug: Log LLM thoughts data for first investigation with data
        if (transformedData.length > 0) {
          const invWithData = transformedData.find((inv: any) => 
            inv.location_llm_thoughts || inv.network_llm_thoughts || inv.logs_llm_thoughts
          );
          if (invWithData) {
            console.log('[InvestigationsService] Found investigation with LLM thoughts:', {
              id: invWithData.id,
              location_llm_thoughts_length: invWithData.location_llm_thoughts?.length || 0,
              network_llm_thoughts_length: invWithData.network_llm_thoughts?.length || 0,
              logs_llm_thoughts_length: invWithData.logs_llm_thoughts?.length || 0,
              location_risk_score: invWithData.location_risk_score,
              network_risk_score: invWithData.network_risk_score,
              logs_risk_score: invWithData.logs_risk_score,
            });
          }
        }
        
        pendingRequests.delete(requestKey);
        return transformedData;
      } catch (error) {
        pendingRequests.delete(requestKey);
        console.error('[InvestigationsService] Error listing investigations:', error);
        throw error;
      }
    })();
    
    pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
  },

  /**
   * Get a specific investigation by ID
   */
  async get(id: string): Promise<Investigation> {
    try {
      const response = await apiClient.get(`/investigation/${id}`);
      return response.data;
    } catch (error) {
      console.error(`[InvestigationsService] Error getting investigation ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new investigation
   */
  async create(request: CreateInvestigationRequest): Promise<Investigation> {
    try {
      const response = await apiClient.post('/investigation', request);
      return response.data;
    } catch (error) {
      console.error('[InvestigationsService] Error creating investigation:', error);
      throw error;
    }
  },

  /**
   * Update an existing investigation
   */
  async update(id: string, request: UpdateInvestigationRequest): Promise<Investigation> {
    try {
      const response = await apiClient.put(`/investigation/${id}`, request);
      return response.data;
    } catch (error) {
      console.error(`[InvestigationsService] Error updating investigation ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete an investigation
   */
  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/investigation/${id}`);
    } catch (error) {
      console.error(`[InvestigationsService] Error deleting investigation ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get investigation state with settings
   */
  async getInvestigationState(id: string): Promise<any> {
    try {
      const response = await apiClient.get(`/investigation-state/${id}`);
      return response.data;
    } catch (error) {
      console.error(`[InvestigationsService] Error getting investigation state ${id}:`, error);
      throw error;
    }
  },

  /**
   * Replay investigation by creating a new investigation state with the same settings
   */
  async replayInvestigation(originalInvestigationId: string): Promise<any> {
    try {
      // First, get the original investigation state with settings
      const originalState = await this.getInvestigationState(originalInvestigationId);
      
      if (!originalState.settings) {
        throw new Error('Original investigation does not have settings to replay');
      }

      // Create new investigation state with the same settings
      // Update the name to indicate it's a replay
      const settings = {
        ...originalState.settings,
        name: `${originalState.settings.name || originalInvestigationId} (Replay)`
      };

      const createRequest = {
        settings: settings,
        lifecycle_stage: 'CREATED',
        status: 'CREATED'
      };

      const response = await apiClient.post('/investigation-state', createRequest);
      return response.data;
    } catch (error) {
      console.error(`[InvestigationsService] Error replaying investigation ${originalInvestigationId}:`, error);
      throw error;
    }
  }
};

