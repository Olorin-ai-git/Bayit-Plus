/**
 * Wizard State Service HTTP Client
 * Feature: 005-polling-and-persistence
 * Task: T020 - Axios client configuration with JWT authentication
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven client setup
 * - JWT authentication via Authorization header
 * - Network error interceptor
 * - No hardcoded values
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getConfig } from '../config/env.config';
import { NetworkError } from './wizardStateService.errors';

/**
 * Get JWT token from localStorage.
 * Uses same key as AuthService for consistency.
 */
function getAuthToken(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

/**
 * Create and configure Axios client for wizard state API.
 * Includes JWT authentication and error handling.
 */
export function createWizardStateClient(): AxiosInstance {
  const config = getConfig();

  const client = axios.create({
    baseURL: `${config.api.baseUrl}/api/v1`,
    timeout: config.api.requestTimeoutMs,
    headers: { 'Content-Type': 'application/json' }
  });

  // Request interceptor: Add JWT token to Authorization header
  client.interceptors.request.use(
    (requestConfig) => {
      const token = getAuthToken();
      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }
      return requestConfig;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: Handle network errors
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (!error.response && error.request) {
        throw new NetworkError('Network request failed. Check connection.', error);
      }
      return Promise.reject(error);
    }
  );

  return client;
}
