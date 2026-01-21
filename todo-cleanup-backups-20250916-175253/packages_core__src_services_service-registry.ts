/**
 * Service Registry
 * 
 * Centralized registry for managing service instances and dependencies.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { BaseService, ServiceHealth } from './base-service';
import { EnhancedBaseService } from './enhanced-base-service';
// TODO: Import from @cvplus/logging after proper setup
// import {  logger  } from '@cvplus/logging';

// Temporary mock logging - TODO: Replace with proper import
const logger = {
  info: (message: string, data?: any) => console.log('[INFO]', message, data),
  error: (message: string, data?: any) => console.error('[ERROR]', message, data),
  warn: (message: string, data?: any) => console.warn('[WARN]', message, data),
  debug: (message: string, data?: any) => console.debug('[DEBUG]', message, data)
};
const loggerFactory = {
  getLogger: (_name: string) => logger
};
// TODO: Import Logger type from @cvplus/logging
// type Logger = { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void; warn: (msg: string, data?: any) => void; debug: (msg: string, data?: any) => void; };

export interface ServiceRegistryConfig {
  autoInitialize?: boolean;
  healthCheckInterval?: number;
}

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private readonly services = new Map<string, BaseService | EnhancedBaseService>();
  private readonly logger = loggerFactory.getLogger('ServiceRegistry');
  private readonly config: ServiceRegistryConfig;
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor(config: ServiceRegistryConfig = {}) {
    this.config = {
      autoInitialize: true,
      healthCheckInterval: 60000, // 1 minute
      ...config
    };

    this.startHealthChecks();
  }

  static getInstance(config?: ServiceRegistryConfig): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry(config);
    }
    return ServiceRegistry.instance;
  }

  /**
   * Register a service (supports both BaseService and EnhancedBaseService)
    */
  async registerService(service: BaseService | EnhancedBaseService): Promise<void> {
    const name = service.name;
    
    if (this.services.has(name)) {
      this.logger.warn('Service already registered, replacing', { name });
    }

    this.services.set(name, service);
    this.logger.info('Service registered', { name, version: service.version });

    if (this.config.autoInitialize && !service.isInitialized) {
      try {
        await service.initialize();
      } catch (error) {
        this.logger.error('Failed to auto-initialize service', { name, error });
        throw error;
      }
    }
  }

  /**
   * Get a service by name
    */
  getService<T extends BaseService | EnhancedBaseService>(name: string): T | undefined {
    return this.services.get(name) as T;
  }

  /**
   * Get a service by name (throws if not found)
    */
  requireService<T extends BaseService>(name: string): T {
    const service = this.getService<T>(name);
    if (!service) {
      throw new Error(`Service '${name}' not found in registry`);
    }
    return service;
  }

  /**
   * Get all registered services
    */
  getAllServices(): BaseService[] {
    return Array.from(this.services.values());
  }

  /**
   * Get all service names
    */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Check if service is registered
    */
  hasService(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Unregister a service
    */
  async unregisterService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) {
      this.logger.warn('Attempted to unregister non-existent service', { name });
      return;
    }

    try {
      if (service.isInitialized) {
        await service.cleanup();
      }
    } catch (error) {
      this.logger.error('Error cleaning up service during unregistration', { name, error });
    }

    this.services.delete(name);
    this.logger.info('Service unregistered', { name });
  }

  /**
   * Initialize all registered services
    */
  async initializeAll(): Promise<void> {
    this.logger.info('Initializing all services');
    
    const initPromises = Array.from(this.services.values())
      .filter(service => !service.isInitialized)
      .map(async (service) => {
        try {
          await service.initialize();
        } catch (error) {
          this.logger.error('Failed to initialize service', { 
            name: service.name, 
            error 
          });
          throw error;
        }
      });

    await Promise.all(initPromises);
    this.logger.info('All services initialized successfully');
  }

  /**
   * Cleanup all registered services
    */
  async cleanupAll(): Promise<void> {
    this.logger.info('Cleaning up all services');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const cleanupPromises = Array.from(this.services.values())
      .filter(service => service.isInitialized)
      .map(async (service) => {
        try {
          await service.cleanup();
        } catch (error) {
          this.logger.error('Failed to cleanup service', { 
            name: service.name, 
            error 
          });
        }
      });

    await Promise.all(cleanupPromises);
    this.logger.info('All services cleaned up');
  }

  /**
   * Get health status of all services
    */
  async getHealthStatus(): Promise<Record<string, ServiceHealth>> {
    const healthChecks = Array.from(this.services.entries()).map(
      async ([name, service]) => {
        try {
          const health = await service.healthCheck();
          return [name, health] as [string, ServiceHealth];
        } catch (error) {
          return [name, {
            status: 'unhealthy' as const,
            timestamp: new Date(),
            errors: [error instanceof Error ? error.message : 'Unknown error']
          }] as [string, ServiceHealth];
        }
      }
    );

    const results = await Promise.all(healthChecks);
    return Object.fromEntries(results);
  }

  private startHealthChecks(): void {
    if (this.config.healthCheckInterval && this.config.healthCheckInterval > 0) {
      this.healthCheckInterval = setInterval(async () => {
        try {
          const healthStatus = await this.getHealthStatus();
          const unhealthyServices = Object.entries(healthStatus)
            .filter(([, health]) => health.status !== 'healthy')
            .map(([name]) => name);

          if (unhealthyServices.length > 0) {
            this.logger.warn('Unhealthy services detected', { 
              unhealthyServices 
            });
          }
        } catch (error) {
          this.logger.error('Health check failed', { error });
        }
      }, this.config.healthCheckInterval);
    }
  }
}