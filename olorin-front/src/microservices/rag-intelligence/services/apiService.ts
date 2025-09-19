import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// API configuration
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8090/api/v1';
const RAG_BASE_URL = process.env.REACT_APP_RAG_API_URL || `${BASE_URL}/rag`;

// Create axios instance with default configuration
const createApiInstance = (baseURL: string = BASE_URL): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // Request interceptor for auth
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add request ID for tracking
      config.headers['X-Request-ID'] = generateRequestId();

      // Add timestamp
      config.headers['X-Client-Timestamp'] = new Date().toISOString();

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log successful responses in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`API Response [${response.config.method?.toUpperCase()}] ${response.config.url}:`, {
          status: response.status,
          data: response.data,
          headers: response.headers
        });
      }
      return response;
    },
    (error: AxiosError) => {
      // Enhanced error handling
      const enhancedError = enhanceError(error);

      // Log errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', enhancedError);
      }

      // Handle specific error cases
      if (enhancedError.status === 401) {
        // Unauthorized - clear auth token and redirect to login
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      } else if (enhancedError.status === 403) {
        // Forbidden - show permission error
        console.warn('Permission denied for API request');
      } else if (enhancedError.status >= 500) {
        // Server errors - could implement retry logic
        console.error('Server error occurred');
      }

      return Promise.reject(enhancedError);
    }
  );

  return instance;
};

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Enhanced error interface
export interface ApiError {
  status?: number;
  message: string;
  details?: any;
  requestId?: string;
  timestamp: string;
  originalError: AxiosError;
}

// Enhance axios errors with additional context
const enhanceError = (error: AxiosError): ApiError => {
  const enhanced: ApiError = {
    status: error.response?.status,
    message: 'An unexpected error occurred',
    details: error.response?.data,
    requestId: error.config?.headers?.['X-Request-ID'] as string,
    timestamp: new Date().toISOString(),
    originalError: error
  };

  if (error.response) {
    // Server responded with error status
    enhanced.message = (error.response.data as any)?.message ||
                      (error.response.data as any)?.error ||
                      `Server error: ${error.response.status}`;
  } else if (error.request) {
    // Request was made but no response received
    enhanced.message = 'Network error: No response from server';
  } else {
    // Something else happened
    enhanced.message = error.message || 'Request configuration error';
  }

  return enhanced;
};

// Retry configuration
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

// Default retry condition - retry on network errors and 5xx server errors
const defaultRetryCondition = (error: AxiosError): boolean => {
  return !error.response || (error.response.status >= 500 && error.response.status < 600);
};

// Retry wrapper for API calls
export const withRetry = async <T>(
  apiCall: () => Promise<AxiosResponse<T>>,
  config: Partial<RetryConfig> = {}
): Promise<AxiosResponse<T>> => {
  const {
    retries = 3,
    retryDelay = 1000,
    retryCondition = defaultRetryCondition
  } = config;

  let lastError: AxiosError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error as AxiosError;

      // Don't retry if condition is not met or if it's the last attempt
      if (!retryCondition(lastError) || attempt === retries) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));

      console.warn(`API call failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
    }
  }

  throw lastError!;
};

// File upload helper
export const uploadFile = async (
  endpoint: string,
  file: File,
  additionalData?: Record<string, any>,
  onUploadProgress?: (progress: number) => void
): Promise<AxiosResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
  }

  return ragApi.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 300000, // 5 minutes for file uploads
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(progress);
      }
    }
  });
};

// Download helper
export const downloadFile = async (
  endpoint: string,
  filename?: string,
  params?: Record<string, any>
): Promise<void> => {
  const response = await ragApi.get(endpoint, {
    params,
    responseType: 'blob'
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Streaming response helper
export const streamResponse = async (
  endpoint: string,
  data: any,
  onChunk: (chunk: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
): Promise<void> => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${RAG_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Request-ID': generateRequestId(),
        'X-Client-Timestamp': new Date().toISOString()
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const chunk = line.slice(6);
            if (chunk === '[DONE]') {
              onComplete?.();
              return;
            }
            try {
              const parsed = JSON.parse(chunk);
              if (parsed.type === 'chunk' && parsed.content) {
                onChunk(parsed.content);
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message || 'Streaming error');
              }
            } catch (e) {
              // If not JSON, treat as plain text chunk
              onChunk(chunk);
            }
          }
        }
      }
      onComplete?.();
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    onError?.(error as Error);
    throw error;
  }
};

// Health check helper
export const healthCheck = async (service?: string): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services?: Record<string, any>;
}> => {
  const endpoint = service ? `/health/${service}` : '/health';
  const response = await ragApi.get(endpoint);
  return response.data;
};

// Cache management
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Create API instances
export const api = createApiInstance();
export const ragApi = createApiInstance(RAG_BASE_URL);

// Create cache instance
export const apiCache = new ApiCache();

// Clear expired cache entries every 5 minutes
setInterval(() => {
  apiCache.clearExpired();
}, 5 * 60 * 1000);

// Generic API helpers
export class ApiHelpers {
  static async get<T>(endpoint: string, params?: Record<string, any>, useCache: boolean = false): Promise<T> {
    const cacheKey = `GET_${endpoint}_${JSON.stringify(params || {})}`;

    if (useCache) {
      const cached = apiCache.get<T>(cacheKey);
      if (cached) return cached;
    }

    const response = await ragApi.get<T>(endpoint, { params });

    if (useCache) {
      apiCache.set(cacheKey, response.data);
    }

    return response.data;
  }

  static async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await ragApi.post<T>(endpoint, data);
    return response.data;
  }

  static async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await ragApi.patch<T>(endpoint, data);
    return response.data;
  }

  static async delete<T>(endpoint: string): Promise<T> {
    const response = await ragApi.delete<T>(endpoint);
    return response.data;
  }

  static async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await ragApi.put<T>(endpoint, data);
    return response.data;
  }
}

// Export types and utilities
export type { ApiError };
export {
  createApiInstance,
  enhanceError,
  generateRequestId,
  withRetry,
  uploadFile,
  downloadFile,
  streamResponse,
  healthCheck
};