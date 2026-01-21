/**
 * Device Fingerprint Service
 * 
 * Provides client interface for device fingerprinting SDK integration.
 */

import axios, { AxiosInstance } from 'axios';
import { getConfig } from '../shared/config/env.config';

export interface DeviceSignal {
  device_id: string;
  transaction_id?: string;
  user_id?: string;
  confidence_score?: number;
  browser_fingerprint?: Record<string, any>;
  behavioral_signals?: Record<string, any>;
  sdk_provider: 'fingerprint_pro' | 'seon' | 'ipqs';
}

export interface DeviceSignalResponse {
  status: string;
  device_id: string;
  transaction_id?: string;
  snowflake: {
    status: string;
    device_id: string;
  };
  splunk: {
    status: string;
    event_id?: string;
  };
}

class DeviceFingerprintService {
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

    // Add auth interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
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
   * Send device signal to backend
   */
  async sendDeviceSignal(signal: DeviceSignal): Promise<DeviceSignalResponse> {
    const response = await this.axiosInstance.post<DeviceSignalResponse>(
      '/device-signals/',
      signal
    );
    return response.data;
  }

  /**
   * Send fallback device signal when SDK fails
   */
  async sendFallbackSignal(
    transactionId: string,
    userId?: string,
    userAgent?: string
  ): Promise<DeviceSignalResponse> {
    const response = await this.axiosInstance.post<DeviceSignalResponse>(
      '/device-signals/fallback',
      null,
      {
        params: {
          transaction_id: transactionId,
          user_id: userId,
          user_agent: userAgent,
        },
      }
    );
    return response.data;
  }
}

// Export singleton instance
export const deviceFingerprintService = new DeviceFingerprintService();
export default deviceFingerprintService;

