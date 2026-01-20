/**
 * API Client Configuration
 *
 * Axios client setup, interceptors, authentication handling,
 * and correlation ID propagation for end-to-end request tracing.
 */

import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { getCorrelationId, generateCorrelationId, setCorrelationId } from '../../utils/logger';
import logger from '../../utils/logger';

// Correlation ID header name (matches backend)
const CORRELATION_ID_HEADER = 'X-Correlation-ID';

// Cloud Run production API URL
const CLOUD_RUN_API_URL = 'https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1';

// Get correct API URL based on platform
const getApiBaseUrl = () => {
  // Production builds always use the production API
  if (!__DEV__) {
    return 'https://api.bayit.tv/api/v1';
  }

  // In development:
  // Web and iOS simulator can use localhost
  if (Platform.OS === 'web' || Platform.OS === 'ios') {
    return 'http://localhost:8000/api/v1';
  }

  // Android emulator uses special address for localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1';
  }

  // tvOS and other platforms use Cloud Run API in development
  return CLOUD_RUN_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();

// Create scoped logger for API client
const apiLogger = logger.scope('API');

// Main API instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate API instance for content endpoints that involve web scraping
export const contentApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Passkey session header name
const PASSKEY_SESSION_HEADER = 'X-Passkey-Session';

/**
 * Add correlation ID, auth token, and passkey session to request.
 */
const addRequestHeaders = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  // Add auth token
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add passkey session token if available
  const passkeySessionToken = useAuthStore.getState().passkeySessionToken;
  if (passkeySessionToken) {
    config.headers[PASSKEY_SESSION_HEADER] = passkeySessionToken;
  }

  // Add correlation ID - use existing or generate new one
  let correlationId = getCorrelationId();
  if (!correlationId) {
    correlationId = generateCorrelationId();
    setCorrelationId(correlationId);
  }
  config.headers[CORRELATION_ID_HEADER] = correlationId;

  // Log request start
  apiLogger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
    correlationId,
    method: config.method,
    url: config.url,
  });

  return config;
};

/**
 * Log response timing and extract correlation ID from response.
 */
const handleResponseSuccess = (response: AxiosResponse): AxiosResponse['data'] => {
  // Extract correlation ID from response (may be different if server generated it)
  const responseCorrelationId = response.headers[CORRELATION_ID_HEADER.toLowerCase()];
  const durationMs = response.headers['x-request-duration-ms'];

  apiLogger.debug(`Response: ${response.status} ${response.config.url}`, {
    status: response.status,
    correlationId: responseCorrelationId,
    durationMs: durationMs ? parseInt(durationMs, 10) : undefined,
  });

  return response.data;
};

// Request interceptor to add auth token and correlation ID
api.interceptors.request.use(addRequestHeaders);

/**
 * Handle response errors and log them.
 */
const handleResponseError = (error: unknown): Promise<never> => {
  const axiosError = error as { response?: AxiosResponse; config?: AxiosRequestConfig };

  // Log error with correlation ID
  const correlationId = getCorrelationId();
  apiLogger.error(`Request failed: ${axiosError.config?.url}`, {
    correlationId,
    status: axiosError.response?.status,
    error: axiosError.response?.data || error,
  });

  if (axiosError.response?.status === 401) {
    const errorDetail = (axiosError.response?.data as { detail?: string })?.detail || '';
    const requestUrl = axiosError.config?.url || '';

    const isCriticalAuthEndpoint = ['/auth/me', '/auth/login', '/auth/refresh'].some(path =>
      requestUrl.includes(path)
    );

    const isTokenError = [
      'Could not validate credentials',
      'Invalid authentication credentials',
      'Token has expired',
      'Invalid token',
      'Signature has expired'
    ].some(msg => errorDetail.toLowerCase().includes(msg.toLowerCase()));

    if (isCriticalAuthEndpoint || isTokenError) {
      useAuthStore.getState().logout();
    }
  }
  return Promise.reject(axiosError.response?.data || error);
};

// Response interceptor for error handling
api.interceptors.response.use(handleResponseSuccess, handleResponseError);

// Content API interceptors
contentApi.interceptors.request.use(addRequestHeaders);
contentApi.interceptors.response.use(handleResponseSuccess, handleResponseError);

export default api;
