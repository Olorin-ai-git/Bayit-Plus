/**
 * API Client Mixin - Reusable external API integration functionality
 * 
 * Provides standardized HTTP client operations with retry logic,
 * error handling, rate limiting, and request/response logging.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
// TODO: Import Logger type from @cvplus/logging\ntype Logger = { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void; warn: (msg: string, data?: any) => void; debug: (msg: string, data?: any) => void; };

export interface ApiClientOptions {
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableRateLimit?: boolean;
  rateLimitRequests?: number;
  rateLimitWindow?: number;
  defaultHeaders?: { [key: string]: string };
  enableLogging?: boolean;
}

export interface ApiRequestOptions extends AxiosRequestConfig {
  skipRetry?: boolean;
  skipRateLimit?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none';
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: any;
  timestamp: Date;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  response?: any;
  requestId?: string;
  context?: any;
}

export interface RateLimitState {
  requests: number;
  windowStart: number;
}

/**
 * API Client Mixin - Provides standardized external API integration
  */
export class ApiClientMixin {
  protected readonly client: AxiosInstance;
  protected readonly apiOptions: Required<ApiClientOptions>;
  protected rateLimitState: RateLimitState;
  protected requestCounter: number = 0;

  constructor(
    protected logger: Logger,
    options: ApiClientOptions = {}
  ) {
    this.apiOptions = {
      baseURL: '',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableRateLimit: true,
      rateLimitRequests: 100,
      rateLimitWindow: 60000, // 1 minute
      defaultHeaders: {
        'User-Agent': 'CVPlus-API-Client/1.0',
        'Content-Type': 'application/json'
      },
      enableLogging: true,
      ...options
    };

    this.rateLimitState = {
      requests: 0,
      windowStart: Date.now()
    };

    this.client = this.createAxiosInstance();
  }

  /**
   * GET request with retry and rate limiting
    */
  protected async apiGet<T = any>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('GET', url, options);
  }

  /**
   * POST request with retry and rate limiting
    */
  protected async apiPost<T = any>(
    url: string,
    data?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('POST', url, { ...options, data });
  }

  /**
   * PUT request with retry and rate limiting
    */
  protected async apiPut<T = any>(
    url: string,
    data?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('PUT', url, { ...options, data });
  }

  /**
   * DELETE request with retry and rate limiting
    */
  protected async apiDelete<T = any>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('DELETE', url, options);
  }

  /**
   * PATCH request with retry and rate limiting
    */
  protected async apiPatch<T = any>(
    url: string,
    data?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('PATCH', url, { ...options, data });
  }

  /**
   * Execute HTTP request with all enhancements
    */
  private async executeRequest<T>(
    method: string,
    url: string,
    options: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Rate limiting check
      if (!options.skipRateLimit && this.apiOptions.enableRateLimit) {
        await this.checkRateLimit();
      }

      // Prepare request configuration
      const config: AxiosRequestConfig = {
        method: method.toLowerCase(),
        url,
        ...options,
        headers: {
          ...this.apiOptions.defaultHeaders,
          ...options.headers,
          'X-Request-ID': requestId
        }
      };

      // Log request
      this.logRequest(method, url, options, requestId);

      // Execute with retry logic
      const response = options.skipRetry 
        ? await this.client.request(config)
        : await this.executeWithRetry(() => this.client.request(config));

      const duration = Date.now() - startTime;

      // Log response
      this.logResponse(response, duration, requestId);

      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
        timestamp: new Date(),
        requestId
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logError(error, method, url, duration, requestId);
      throw this.createApiError(error, requestId, { method, url, options });
    }
  }

  /**
   * Execute request with retry logic
    */
  private async executeWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.apiOptions.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if (this.isClientError(error)) {
          throw error;
        }
        
        if (attempt === this.apiOptions.retryAttempts) {
          this.logger.error('API request failed after all retry attempts', {
            attempt,
            error: this.formatAxiosError(lastError)
          });
          break;
        }
        
        this.logger.warn('API request failed, retrying', {
          attempt,
          maxAttempts: this.apiOptions.retryAttempts,
          error: this.formatAxiosError(lastError)
        });
        
        // Exponential backoff with jitter
        const delay = this.calculateRetryDelay(attempt);
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Rate limiting implementation
    */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowElapsed = now - this.rateLimitState.windowStart;
    
    // Reset window if expired
    if (windowElapsed >= this.apiOptions.rateLimitWindow) {
      this.rateLimitState = {
        requests: 0,
        windowStart: now
      };
    }
    
    // Check if rate limit exceeded
    if (this.rateLimitState.requests >= this.apiOptions.rateLimitRequests) {
      const waitTime = this.apiOptions.rateLimitWindow - windowElapsed;
      
      this.logger.warn('Rate limit exceeded, waiting', { waitTime });
      await this.delay(waitTime);
      
      // Reset after waiting
      this.rateLimitState = {
        requests: 0,
        windowStart: Date.now()
      };
    }
    
    this.rateLimitState.requests++;
  }

  /**
   * Create configured Axios instance
    */
  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.apiOptions.baseURL,
      timeout: this.apiOptions.timeout,
      headers: this.apiOptions.defaultHeaders
    });

    // Request interceptor
    instance.interceptors.request.use(
      (config) => {
        (config as any).metadata = { startTime: Date.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    instance.interceptors.response.use(
      (response) => {
        const duration = Date.now() - ((response.config as any).metadata?.startTime || Date.now());
        (response as any).metadata = { duration };
        return response;
      },
      (error) => {
        if (error.config) {
          const duration = Date.now() - ((error.config as any).metadata?.startTime || Date.now());
          (error as any).metadata = { duration };
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }

  // Utility methods

  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.apiOptions.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isClientError(error: any): boolean {
    return error?.response?.status >= 400 && error?.response?.status < 500;
  }

  private formatAxiosError(error: any): any {
    if (error?.isAxiosError) {
      return {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method
      };
    }
    return error;
  }

  private createApiError(error: any, requestId: string, context?: any): ApiError {
    if (error?.isAxiosError) {
      const axiosError = error as AxiosError;
      return {
        code: 'api_request_failed',
        message: axiosError.message,
        status: axiosError.response?.status,
        response: axiosError.response?.data,
        requestId,
        context
      };
    }
    
    return {
      code: 'unknown_api_error',
      message: error instanceof Error ? error.message : String(error),
      requestId,
      context
    };
  }

  // Logging methods

  private logRequest(
    method: string,
    url: string,
    options: ApiRequestOptions,
    requestId: string
  ): void {
    if (!this.apiOptions.enableLogging || options.logLevel === 'none') return;
    
    const logLevel = options.logLevel || 'debug';
    const logData = {
      requestId,
      method: method.toUpperCase(),
      url,
      hasData: !!options.data
    };

    switch (logLevel) {
      case 'debug':
        this.logger.debug('API request initiated', logData);
        break;
      case 'info':
        this.logger.info('API request initiated', logData);
        break;
      default:
        this.logger.debug('API request initiated', logData);
    }
  }

  private logResponse(
    response: AxiosResponse,
    duration: number,
    requestId: string
  ): void {
    if (!this.apiOptions.enableLogging) return;
    
    this.logger.debug('API request completed', {
      requestId,
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      hasData: !!response.data
    });
  }

  private logError(
    error: any,
    method: string,
    url: string,
    duration: number,
    requestId: string
  ): void {
    if (!this.apiOptions.enableLogging) return;
    
    this.logger.error('API request failed', {
      requestId,
      method: method.toUpperCase(),
      url,
      duration: `${duration}ms`,
      error: this.formatAxiosError(error)
    });
  }

  /**
   * Get current rate limit status
    */
  protected getRateLimitStatus(): {
    requests: number;
    limit: number;
    windowStart: Date;
    windowEnd: Date;
  } {
    return {
      requests: this.rateLimitState.requests,
      limit: this.apiOptions.rateLimitRequests,
      windowStart: new Date(this.rateLimitState.windowStart),
      windowEnd: new Date(this.rateLimitState.windowStart + this.apiOptions.rateLimitWindow)
    };
  }

  /**
   * Reset rate limit (for testing)
    */
  protected resetRateLimit(): void {
    this.rateLimitState = {
      requests: 0,
      windowStart: Date.now()
    };
  }
}

/**
 * Factory function to create API client mixin
  */
export function createApiClientMixin(
  logger: Logger,
  options?: ApiClientOptions
): ApiClientMixin {
  return new ApiClientMixin(logger, options);
}