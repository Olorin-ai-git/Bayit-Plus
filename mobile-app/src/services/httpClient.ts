/**
 * HTTP Client for Mobile App
 *
 * Re-exports the shared API client for backward compatibility.
 * The shared client provides auth token injection, correlation IDs,
 * CSRF protection, and security headers.
 *
 * New code should import from '@bayit/shared-services/api' directly.
 */

import { api } from '@bayit/shared-services/api';

/**
 * HTTP Client compatible with shared services that expect get/post methods.
 * Wraps the shared axios instance to match the { data: T } response shape
 * expected by callers of the old httpClient.
 */
class HttpClient {
  async get<T = unknown>(endpoint: string): Promise<{ data: T }> {
    const data = await api.get<unknown, T>(endpoint);
    return { data };
  }

  async post<T = unknown>(endpoint: string, body?: unknown): Promise<{ data: T }> {
    const data = await api.post<unknown, T>(endpoint, body);
    return { data };
  }

  async put<T = unknown>(endpoint: string, body?: unknown): Promise<{ data: T }> {
    const data = await api.put<unknown, T>(endpoint, body);
    return { data };
  }

  async patch<T = unknown>(endpoint: string, body?: unknown): Promise<{ data: T }> {
    const data = await api.patch<unknown, T>(endpoint, body);
    return { data };
  }

  async delete<T = unknown>(endpoint: string): Promise<{ data: T }> {
    const data = await api.delete<unknown, T>(endpoint);
    return { data };
  }
}

export const httpClient = new HttpClient();
export default httpClient;
