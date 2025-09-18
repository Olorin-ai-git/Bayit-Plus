/**
 * Shared Services for Olorin Microservices
 * Common service layer for API communication and business logic
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { EventBusManager } from '../events/eventBus';

export interface APIResponse<T = any> {
  data: T;
  status: number;
  message: string;
  timestamp: string;
}

export interface ServiceConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  errorRate: number;
  lastCheck: Date;
}

/**
 * Base API Service for all microservices
 */
export class BaseAPIService {
  protected client: AxiosInstance;
  protected eventBus: EventBusManager;
  protected serviceName: string;

  constructor(config: ServiceConfig, serviceName: string) {
    this.serviceName = serviceName;
    this.eventBus = EventBusManager.getInstance();

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🚀 API Request [${this.serviceName}]: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error(`❌ API Request Error [${this.serviceName}]:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response [${this.serviceName}]: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`❌ API Response Error [${this.serviceName}]:`, error);

        // Emit service error event
        this.eventBus.emit('service:error', {
          service: this.serviceName,
          error: error
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Generic GET request
   */
  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.client.get<APIResponse<T>>(url, config);
    return response.data;
  }

  /**
   * Generic POST request
   */
  protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.client.post<APIResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * Generic PUT request
   */
  protected async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.client.put<APIResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * Generic DELETE request
   */
  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.client.delete<APIResponse<T>>(url, config);
    return response.data;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      await this.get('/health');
      const latency = Date.now() - startTime;

      const health: ServiceHealth = {
        service: this.serviceName,
        status: 'healthy',
        latency,
        errorRate: 0,
        lastCheck: new Date()
      };

      this.eventBus.emit('service:health:check', {
        service: this.serviceName,
        status: health
      });

      return health;
    } catch (error) {
      const health: ServiceHealth = {
        service: this.serviceName,
        status: 'down',
        latency: 0,
        errorRate: 100,
        lastCheck: new Date()
      };

      this.eventBus.emit('service:health:check', {
        service: this.serviceName,
        status: health
      });

      return health;
    }
  }
}

/**
 * Investigation Service - handles investigation operations
 */
export class InvestigationService extends BaseAPIService {
  constructor(baseURL: string) {
    super({
      baseURL,
      timeout: 30000,
      retries: 3
    }, 'investigation-service');
  }

  async createInvestigation(data: any) {
    return this.post('/investigations', data);
  }

  async getInvestigation(id: string) {
    return this.get(`/investigations/${id}`);
  }

  async updateInvestigation(id: string, data: any) {
    return this.put(`/investigations/${id}`, data);
  }

  async deleteInvestigation(id: string) {
    return this.delete(`/investigations/${id}`);
  }

  async getInvestigations(params?: any) {
    return this.get('/investigations', { params });
  }
}

/**
 * Analytics Service - handles analytics and metrics
 */
export class AnalyticsService extends BaseAPIService {
  constructor(baseURL: string) {
    super({
      baseURL,
      timeout: 15000,
      retries: 2
    }, 'analytics-service');
  }

  async getMetrics(params: any) {
    return this.get('/metrics', { params });
  }

  async trackEvent(event: any) {
    return this.post('/events', event);
  }

  async getReports(params?: any) {
    return this.get('/reports', { params });
  }
}

/**
 * Service Registry - manages all microservice instances
 */
export class ServiceRegistry {
  private services: Map<string, BaseAPIService> = new Map();
  private configs: Map<string, ServiceConfig> = new Map();

  /**
   * Register a service
   */
  register(name: string, config: ServiceConfig, serviceClass?: typeof BaseAPIService): void {
    this.configs.set(name, config);

    const ServiceClass = serviceClass || BaseAPIService;
    const service = new ServiceClass(config, name);
    this.services.set(name, service);

    console.log(`📋 Registered service: ${name} at ${config.baseURL}`);
  }

  /**
   * Get a service instance
   */
  get<T extends BaseAPIService = BaseAPIService>(name: string): T | undefined {
    return this.services.get(name) as T;
  }

  /**
   * Check health of all services
   */
  async checkAllHealth(): Promise<ServiceHealth[]> {
    const healthChecks = Array.from(this.services.values()).map(service =>
      service.healthCheck()
    );

    return Promise.all(healthChecks);
  }

  /**
   * Get service configuration
   */
  getConfig(name: string): ServiceConfig | undefined {
    return this.configs.get(name);
  }

  /**
   * List all registered services
   */
  list(): string[] {
    return Array.from(this.services.keys());
  }
}

/**
 * Global service registry instance
 */
export const serviceRegistry = new ServiceRegistry();

/**
 * Initialize default services for Olorin microservices
 */
export function initializeServices(): void {
  // Register all 8 microservices
  serviceRegistry.register('autonomous-investigation', {
    baseURL: 'http://localhost:3001',
    timeout: 30000,
    retries: 3
  });

  serviceRegistry.register('manual-investigation', {
    baseURL: 'http://localhost:3002',
    timeout: 30000,
    retries: 3
  }, InvestigationService as any);

  serviceRegistry.register('agent-analytics', {
    baseURL: 'http://localhost:3003',
    timeout: 15000,
    retries: 2
  }, AnalyticsService as any);

  serviceRegistry.register('rag-intelligence', {
    baseURL: 'http://localhost:3004',
    timeout: 20000,
    retries: 3
  });

  serviceRegistry.register('visualization', {
    baseURL: 'http://localhost:3005',
    timeout: 10000,
    retries: 2
  });

  serviceRegistry.register('reporting', {
    baseURL: 'http://localhost:3006',
    timeout: 25000,
    retries: 3
  });

  serviceRegistry.register('core-ui', {
    baseURL: 'http://localhost:3007',
    timeout: 10000,
    retries: 2
  });

  serviceRegistry.register('design-system', {
    baseURL: 'http://localhost:3008',
    timeout: 5000,
    retries: 1
  });

  console.log('🎯 All Olorin microservices initialized');
}

/**
 * Service utilities
 */
export const ServiceUtils = {
  /**
   * Create service URL
   */
  createServiceURL(serviceName: string, path: string): string {
    const config = serviceRegistry.getConfig(serviceName);
    if (!config) {
      throw new Error(`Service ${serviceName} not registered`);
    }
    return `${config.baseURL}${path.startsWith('/') ? path : '/' + path}`;
  },

  /**
   * Retry function with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retry(fn, retries - 1, delay * 2);
    }
  },

  /**
   * Validate service response
   */
  validateResponse<T>(response: APIResponse<T>): boolean {
    return response.status >= 200 && response.status < 300;
  }
};

export default {
  BaseAPIService,
  InvestigationService,
  AnalyticsService,
  ServiceRegistry,
  serviceRegistry,
  initializeServices,
  ServiceUtils
};