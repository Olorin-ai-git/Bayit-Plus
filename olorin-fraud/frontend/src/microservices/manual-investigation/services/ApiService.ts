import { ServiceConfig, ServiceError, ApiResponse } from '../types';

export class ApiService {
  private config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
  }

  /**
   * Generic GET request
   */
  protected async get<T>(endpoint: string, headers: Record<string, string> = {}): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, headers);
  }

  /**
   * Generic POST request
   */
  protected async post<T>(
    endpoint: string,
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<T> {
    return this.request<T>('POST', endpoint, data, headers);
  }

  /**
   * Generic PUT request
   */
  protected async put<T>(
    endpoint: string,
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, data, headers);
  }

  /**
   * Generic PATCH request
   */
  protected async patch<T>(
    endpoint: string,
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, headers);
  }

  /**
   * Generic DELETE request
   */
  protected async del<T>(
    endpoint: string,
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<T> {
    return this.request<T>('DELETE', endpoint, data, headers);
  }

  /**
   * Binary response request (for file downloads)
   */
  protected async getBinaryResponse(endpoint: string): Promise<Blob> {
    const url = this.buildUrl(endpoint);
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.getDefaultHeaders(),
    });

    if (!response.ok) {
      const error = await this.handleErrorResponse(response);
      throw error;
    }

    return response.blob();
  }

  /**
   * Core request method with retry logic
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const headers = { ...this.getDefaultHeaders(), ...customHeaders };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      if (data instanceof FormData) {
        options.body = data;
        // Remove content-type header for FormData to let browser set it with boundary
        delete headers['Content-Type'];
      } else {
        options.body = JSON.stringify(data);
      }
    }

    const response = await this.fetchWithRetry(url, options);
    return this.handleResponse<T>(response);
  }

  /**
   * Fetch with automatic retry logic
   */
  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.retry_attempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout_ms);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error as Error;

        if (this.config.debug_mode) {
          console.warn(`API request attempt ${attempt + 1} failed:`, error);
        }

        // Don't retry on the last attempt
        if (attempt < this.config.retry_attempts) {
          await this.delay(this.config.retry_delay_ms * Math.pow(2, attempt));
        }
      }
    }

    throw this.createServiceError(
      'NETWORK_ERROR',
      `Request failed after ${this.config.retry_attempts + 1} attempts: ${lastError.message}`,
      500,
      { originalError: lastError.message }
    );
  }

  /**
   * Handle API response and extract data
   */
  protected async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await this.handleErrorResponse(response);
      throw error;
    }

    try {
      const data = await response.json();
      return data;
    } catch (error) {
      throw this.createServiceError(
        'PARSE_ERROR',
        'Failed to parse response JSON',
        response.status,
        { parseError: (error as Error).message }
      );
    }
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<ServiceError> {
    let errorData: any = {};

    try {
      errorData = await response.json();
    } catch {
      // If JSON parsing fails, use default error structure
    }

    const message = errorData.error?.message || errorData.message || response.statusText;
    const code = errorData.error?.code || errorData.code || `HTTP_${response.status}`;

    return this.createServiceError(
      code,
      message,
      response.status,
      errorData.error?.details || errorData.details
    );
  }

  /**
   * Extract data from API response wrapper
   */
  protected handleResponse<T>(apiResponse: ApiResponse<T>): T {
    if (!apiResponse.success || apiResponse.error) {
      const error = apiResponse.error!;
      throw this.createServiceError(
        error.code,
        error.message,
        400, // Default to 400 for API-level errors
        error.details
      );
    }

    if (apiResponse.data === undefined) {
      throw this.createServiceError(
        'NO_DATA',
        'API response contains no data',
        500
      );
    }

    return apiResponse.data;
  }

  /**
   * Build full URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.api_base_url.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    return `${baseUrl}/${cleanEndpoint}`;
  }

  /**
   * Get default headers for requests
   */
  private getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add authorization header if available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Get authentication token from storage
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    return localStorage.getItem('auth_token') ||
           sessionStorage.getItem('auth_token');
  }

  /**
   * Create a standardized service error
   */
  private createServiceError(
    code: string,
    message: string,
    status: number,
    context?: Record<string, any>
  ): ServiceError {
    return {
      name: 'ServiceError',
      message,
      code,
      status,
      context,
    };
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update service configuration
   */
  public updateConfig(newConfig: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ServiceConfig {
    return { ...this.config };
  }
}