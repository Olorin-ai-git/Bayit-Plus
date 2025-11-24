import { snakeToCamel, camelToSnake } from '../utils/caseConversion';
import { eventBusInstance } from '@shared/events/UnifiedEventBus';

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: string;
  timestamp: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: Record<string, any>;
}

export class BaseApiService {
  protected baseUrl: string;
  protected defaultHeaders: Record<string, string>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  protected getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
      };
    }
    return {};
  }

  protected async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(fullUrl, config);

      // 304 Not Modified is a valid response - don't treat it as an error
      if (!response.ok && response.status !== 304) {
        await this.handleErrorResponse(response);
      }

      return response;
    } catch (error) {
      // Suppress browser extension errors that are harmless
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isBrowserExtensionError = 
        errorMessage.includes('message channel closed') ||
        errorMessage.includes('asynchronous response') ||
        errorMessage.includes('Extension context invalidated');
      
      if (isBrowserExtensionError) {
        // This is a browser extension error, not our code - log at debug level only
        if (process.env.NODE_ENV === 'development') {
          console.debug('[BaseApiService] Browser extension interference detected (harmless):', errorMessage);
        }
        // Re-throw as a network error so the caller can handle it appropriately
        throw new Error('Network request failed - browser extension may be interfering');
      }
      
      console.error('API request failed:', error);
      throw error;
    }
  }

  protected async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any = {};

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
    } catch (parseError) {
      errorData = { message: response.statusText };
    }

    // Extract error message from various possible formats
    const errorMessage =
      errorData.message ||
      errorData.error ||
      errorData.detail ||
      (typeof errorData === 'string' ? errorData : null) ||
      `HTTP ${response.status}: ${response.statusText}`;

    const apiError: ApiError = {
      message: errorMessage,
      status: response.status,
      code: errorData.code || errorData.error,
      details: errorData.details || errorData,
    };

    // Generate user-friendly error messages and titles
    let userMessage: string;
    let errorTitle: string;

    const statusCode = response.status;
    if (statusCode === 400) {
      errorTitle = 'Bad Request';
      userMessage = 'Invalid request. Please check your input and try again.';
    } else if (statusCode === 401) {
      errorTitle = 'Unauthorized';
      userMessage = 'You are not authorized. Please log in again.';
    } else if (statusCode === 403) {
      errorTitle = 'Forbidden';
      userMessage = 'You do not have permission to access this resource.';
    } else if (statusCode === 404) {
      errorTitle = 'Not Found';
      userMessage = 'The requested resource was not found.';
    } else if (statusCode === 408) {
      errorTitle = 'Request Timeout';
      userMessage = 'The request took too long. Please try again.';
    } else if (statusCode === 429) {
      errorTitle = 'Too Many Requests';
      userMessage = 'Too many requests. Please wait a moment and try again.';
    } else if (statusCode >= 500 && statusCode < 600) {
      errorTitle = 'Server Error';
      userMessage = 'A server error occurred. Our team has been notified.';
    } else {
      errorTitle = 'Request Failed';
      userMessage = errorMessage || 'An error occurred while processing your request.';
    }

    // Emit error notification via event bus
    eventBusInstance.emit('ui:notification:show', {
      notification: {
        id: `api_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'error',
        title: errorTitle,
        message: userMessage,
        duration: 5000
      }
    });

    // Create an Error object with the message so it can be caught properly
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).code = apiError.code;
    (error as any).details = apiError.details;

    throw error;
  }

  protected async get<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
    const response = await this.fetch(url, { 
      method: 'GET',
      headers: headers || {}
    });
    
    // Handle 304 Not Modified - return null to indicate no change
    if (response.status === 304) {
      return null;
    }
    
    const data = await response.json();
    const result = data.data || data;
    // Transform snake_case to camelCase and convert ISO dates to Date objects
    return snakeToCamel<T>(result);
  }

  protected async post<T>(url: string, body?: any): Promise<T> {
    const response = await this.fetch(url, {
      method: 'POST',
      body: body ? JSON.stringify(camelToSnake(body)) : undefined,
    });
    const data = await response.json();
    const result = data.data || data;
    // Transform snake_case to camelCase and convert ISO dates to Date objects
    return snakeToCamel<T>(result);
  }

  protected async put<T>(url: string, body?: any): Promise<T> {
    const response = await this.fetch(url, {
      method: 'PUT',
      body: body ? JSON.stringify(camelToSnake(body)) : undefined,
    });
    const data = await response.json();
    const result = data.data || data;
    // Transform snake_case to camelCase and convert ISO dates to Date objects
    return snakeToCamel<T>(result);
  }

  protected async patch<T>(url: string, body?: any): Promise<T> {
    const response = await this.fetch(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(camelToSnake(body)) : undefined,
    });
    const data = await response.json();
    const result = data.data || data;
    // Transform snake_case to camelCase and convert ISO dates to Date objects
    return snakeToCamel<T>(result);
  }

  protected async delete(url: string): Promise<void> {
    await this.fetch(url, { method: 'DELETE' });
  }

  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(`${key}[]`, v.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    return searchParams.toString();
  }

  public setAuthToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  public clearAuthToken(): void {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get<{ status: string; timestamp: string }>('/health');
  }
}