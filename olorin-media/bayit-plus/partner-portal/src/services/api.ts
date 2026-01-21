/**
 * B2B API Client
 *
 * Axios-based HTTP client for B2B Partner APIs.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getB2BConfig, getB2BApiUrl } from '../config/env';

type TokenGetter = () => string | null;
type TokenRefresher = () => Promise<void>;
type LogoutHandler = () => void;

let getAccessToken: TokenGetter = () => null;
let refreshAccessToken: TokenRefresher = async () => {};
let handleLogout: LogoutHandler = () => {};

export function setAuthHandlers(
  tokenGetter: TokenGetter,
  tokenRefresher: TokenRefresher,
  logoutHandler: LogoutHandler
): void {
  getAccessToken = tokenGetter;
  refreshAccessToken = tokenRefresher;
  handleLogout = logoutHandler;
}

function createApiClient(): AxiosInstance {
  const config = getB2BConfig();

  const client = axios.create({
    baseURL: getB2BApiUrl(''),
    timeout: config.requestTimeoutMs,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  client.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      const token = getAccessToken();
      if (token && requestConfig.headers) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }
      return requestConfig;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          await refreshAccessToken();
          const token = getAccessToken();
          if (token && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return client(originalRequest);
        } catch (refreshError) {
          handleLogout();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

let apiClient: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (!apiClient) {
    apiClient = createApiClient();
  }
  return apiClient;
}

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const client = getApiClient();
  const response = await client.get<T>(path, { params });
  return response.data;
}

export async function apiPost<T>(path: string, data?: unknown): Promise<T> {
  const client = getApiClient();
  const response = await client.post<T>(path, data);
  return response.data;
}

export async function apiPut<T>(path: string, data?: unknown): Promise<T> {
  const client = getApiClient();
  const response = await client.put<T>(path, data);
  return response.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const client = getApiClient();
  const response = await client.delete<T>(path);
  return response.data;
}
