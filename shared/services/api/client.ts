/**
 * API Client Configuration
 *
 * Axios client setup, interceptors, and authentication handling.
 */

import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../../stores/authStore';

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

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      const errorDetail = error.response?.data?.detail || '';
      const requestUrl = error.config?.url || '';

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
    return Promise.reject(error.response?.data || error);
  }
);

// Content API interceptors
contentApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

contentApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
