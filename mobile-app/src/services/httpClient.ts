/**
 * HTTP Client for Mobile App
 * Compatible with profile controls API and other authenticated services
 */

import { getApiBaseUrl } from '../config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = getApiBaseUrl();
const AUTH_TOKEN_KEY = '@bayit_auth_token';

/**
 * HTTP Client with authentication support
 * Compatible with shared services that expect get/post methods
 */
class HttpClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Get authentication token from storage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Make authenticated request
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<{ data: T }> {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAuthToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    return { data };
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string): Promise<{ data: T }> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<{ data: T }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any): Promise<{ data: T }> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<{ data: T }> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const httpClient = new HttpClient();
export default httpClient;
