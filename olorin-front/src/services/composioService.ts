/**
 * Composio API Service
 * 
 * Provides client interface for Composio OAuth flows and connection management.
 */

import axios, { AxiosInstance } from 'axios';
import { getConfig } from '../shared/config/env.config';

export interface ComposioConnection {
  id: string;
  tenant_id: string;
  toolkit_name: string;
  connection_id: string;
  status: 'active' | 'expired' | 'revoked';
  expires_at?: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

export interface OAuthInitiateRequest {
  redirect_uri: string;
  scopes?: string[];
}

export interface OAuthInitiateResponse {
  oauth_url: string;
  toolkit: string;
  tenant_id: string;
}

export interface TestConnectionRequest {
  toolkit: string;
  action: string;
  parameters: Record<string, any>;
}

export interface TestConnectionResponse {
  success: boolean;
  result: any;
  connection_id: string;
  toolkit: string;
  action: string;
}

export interface Toolkit {
  name: string;
  description?: string;
  icon?: string;
}

export interface Action {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

class ComposioService {
  private axiosInstance: AxiosInstance;

  constructor() {
    const config = getConfig();
    this.axiosInstance = axios.create({
      baseURL: config.api.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor if needed
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Initiate OAuth flow for a toolkit
   */
  async initiateOAuth(
    toolkit: string,
    redirectUri: string,
    scopes?: string[]
  ): Promise<OAuthInitiateResponse> {
    const response = await this.axiosInstance.post<OAuthInitiateResponse>(
      `/composio/connect/${toolkit}`,
      {
        redirect_uri: redirectUri,
        scopes: scopes || [],
      }
    );
    return response.data;
  }

  /**
   * Process OAuth callback
   */
  async processCallback(
    toolkit: string,
    code: string,
    redirectUri: string,
    state?: string
  ): Promise<ComposioConnection> {
    const params = new URLSearchParams({
      toolkit,
      code,
      redirect_uri: redirectUri,
    });
    if (state) {
      params.append('state', state);
    }

    const response = await this.axiosInstance.get<ComposioConnection>(
      `/composio/callback?${params.toString()}`
    );
    return response.data;
  }

  /**
   * List all connections for the tenant
   */
  async listConnections(
    toolkit?: string,
    status?: string
  ): Promise<ComposioConnection[]> {
    const params = new URLSearchParams();
    if (toolkit) params.append('toolkit', toolkit);
    if (status) params.append('status_filter', status);

    const response = await this.axiosInstance.get<ComposioConnection[]>(
      `/composio/connections?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get connection by ID
   */
  async getConnection(connectionId: string): Promise<ComposioConnection> {
    const response = await this.axiosInstance.get<ComposioConnection>(
      `/composio/connections/${connectionId}`
    );
    return response.data;
  }

  /**
   * Delete a connection
   */
  async deleteConnection(connectionId: string): Promise<void> {
    await this.axiosInstance.delete(`/composio/connections/${connectionId}`);
  }

  /**
   * Test a connection by executing a test action
   */
  async testConnection(
    connectionId: string,
    request: TestConnectionRequest
  ): Promise<TestConnectionResponse> {
    const response = await this.axiosInstance.post<TestConnectionResponse>(
      `/composio/test-connection/${connectionId}`,
      request
    );
    return response.data;
  }

  /**
   * List available toolkits
   */
  async listToolkits(): Promise<Toolkit[]> {
    const response = await this.axiosInstance.get<Toolkit[]>(
      '/composio/toolkits'
    );
    return response.data;
  }

  /**
   * List actions for a toolkit
   */
  async listActions(toolkit: string): Promise<Action[]> {
    const response = await this.axiosInstance.get<Action[]>(
      `/composio/toolkits/${toolkit}/actions`
    );
    return response.data;
  }
}

// Export singleton instance
export const composioService = new ComposioService();
export default composioService;

