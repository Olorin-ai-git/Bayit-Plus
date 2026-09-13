import { CONFIG } from '../config/constants';
import { getToken } from '../background/auth-manager';
import type { QuotaCheckResponse, UsageSyncRequest, UsageSyncResponse, VoicesResponse } from '../types/api';

class ApiClient {
  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken();
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${CONFIG.API.BASE_URL}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(CONFIG.API.TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    return response.json() as Promise<T>;
  }

  async checkQuota(): Promise<QuotaCheckResponse> {
    return this.request<QuotaCheckResponse>('/api/v1/usage/quota');
  }

  async syncUsage(payload: UsageSyncRequest): Promise<UsageSyncResponse> {
    return this.request<UsageSyncResponse>('/api/v1/usage/sync', { method: 'POST', body: JSON.stringify(payload) });
  }

  async getVoices(): Promise<VoicesResponse> {
    return this.request<VoicesResponse>('/api/v1/dubbing/voices');
  }
}

export const apiClient = new ApiClient();
