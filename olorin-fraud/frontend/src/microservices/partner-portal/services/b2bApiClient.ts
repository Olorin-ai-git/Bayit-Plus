/**
 * B2B API Client
 *
 * Axios-based HTTP client for B2B Partner APIs.
 * Handles authentication, token refresh, and error handling.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { getB2BConfig, getB2BApiUrl } from '../config/env.config';

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
}

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

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

function createB2BApiClient(): AxiosInstance {
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
    async (error: AxiosError<ApiError>) => {
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

let b2bApiClient: AxiosInstance | null = null;

export function getB2BApiClient(): AxiosInstance {
  if (!b2bApiClient) {
    b2bApiClient = createB2BApiClient();
  }
  return b2bApiClient;
}

export function resetB2BApiClient(): void {
  b2bApiClient = null;
}

export async function b2bGet<T>(
  path: string,
  params?: Record<string, unknown>
): Promise<ApiResponse<T>> {
  const client = getB2BApiClient();
  const response = await client.get<T>(path, { params });
  return { data: response.data, status: response.status };
}

export async function b2bPost<T>(
  path: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  const client = getB2BApiClient();
  const response = await client.post<T>(path, data);
  return { data: response.data, status: response.status };
}

export async function b2bPut<T>(
  path: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  const client = getB2BApiClient();
  const response = await client.put<T>(path, data);
  return { data: response.data, status: response.status };
}

export async function b2bPatch<T>(
  path: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  const client = getB2BApiClient();
  const response = await client.patch<T>(path, data);
  return { data: response.data, status: response.status };
}

export async function b2bDelete<T>(path: string): Promise<ApiResponse<T>> {
  const client = getB2BApiClient();
  const response = await client.delete<T>(path);
  return { data: response.data, status: response.status };
}
