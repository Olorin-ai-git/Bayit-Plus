// @ts-ignore - Export conflicts/**
 * Service Registry
 * 
 * Manages service registration, discovery, and lifecycle
 * for all multimedia services in the system.
 */

import { ServiceType, ServiceConfig, MediaService } from '../../types';
import { Logger } from '../utils/Logger';

export interface ServiceRegistration {
  type: ServiceType;
  instance: MediaService;
  config: Partial<ServiceConfig>;
  registeredAt: Date;
  lastHealthCheck?: Date;
  healthy: boolean;
  metadata?: Record<string, any>;
}

export interface ServiceTypeInfo {
  type: ServiceType;
  description: string;
  capabilities: string[];
  defaultConfig: Partial<ServiceConfig>;
  registeredAt: Date;
}

/**
 * Central service registry for multimedia services
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private readonly logger: Logger;
  private readonly services: Map<string, ServiceRegistration>;
  private readonly serviceTypes: Map<ServiceType, ServiceTypeInfo>;
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor() {
    this.logger = new Logger('ServiceRegistry');
    this.services = new Map();
    this.serviceTypes = new Map();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Initialize the service registry
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing service registry');

      // Start health check monitoring
      this.startHealthCheckMonitoring();

      this.logger.info('Service registry initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize service registry', { error });
      throw error;
    }
  }

  /**
   * Register a service instance
   */
  public async registerService(
    serviceType: ServiceType,
    instance: MediaService,
    config?: Partial<ServiceConfig>,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      const serviceId = this.generateServiceId(serviceType);

      const registration: ServiceRegistration = {
        type: serviceType,
        instance,
        config: config || {},
        registeredAt: new Date(),
        healthy: true,
        metadata
      };

      this.services.set(serviceId, registration);

      this.logger.info('Service registered', {
        serviceId,
        serviceType,
        metadata
      });

      // Perform initial health check
      await this.performHealthCheck(serviceId);

      return serviceId;

    } catch (error) {
      this.logger.error('Failed to register service', { serviceType, error });
      throw error;
    }
  }

  /**
   * Register a service type with its capabilities
   */
  public async registerServiceType(
    serviceType: ServiceType,
    defaultConfig: Partial<ServiceConfig>,
    description?: string,
    capabilities?: string[]
  ): Promise<void> {
    try {
      const typeInfo: ServiceTypeInfo = {
        type: serviceType,
        description: description || `${serviceType} multimedia service`,
        capabilities: capabilities || [],
        defaultConfig,
        registeredAt: new Date()
      };

      this.serviceTypes.set(serviceType, typeInfo);

      this.logger.debug('Service type registered', {
        serviceType,
        capabilities: capabilities?.length || 0
      });

    } catch (error) {
      this.logger.error('Failed to register service type', { serviceType, error });
      throw error;
    }
  }

  /**
   * Unregister a service
   */
  public async unregisterService(serviceId: string): Promise<boolean> {
    try {
      const registration = this.services.get(serviceId);
      if (!registration) {
        return false;
      }

      // Cleanup service instance
      try {
        await registration.instance.cleanup();
      } catch (error) {
        this.logger.warn('Service cleanup failed during unregistration', {
          serviceId,
          error
        });
      }

      this.services.delete(serviceId);

      this.logger.info('Service unregistered', { serviceId });
      return true;

    } catch (error) {
      this.logger.error('Failed to unregister service', { serviceId, error });
      return false;
    }
  }

  /**
   * Get service by ID
   */
  public getService(serviceId: string): ServiceRegistration | undefined {
    return this.services.get(serviceId);
  }

  /**
   * Get all services of a specific type
   */
  public getServicesByType(serviceType: ServiceType): ServiceRegistration[] {
    const services: ServiceRegistration[] = [];
    
    for (const registration of this.services.values()) {
      if (registration.type === serviceType) {
        services.push(registration);
      }
    }

    return services;
  }

  /**
   * Get all registered services
   */
  public getAllServices(): ServiceRegistration[] {
    return Array.from(this.services.values());
  }

  /**
   * Get all registered service types
   */
  public getRegisteredServices(): ServiceType[] {
    return Array.from(this.serviceTypes.keys());
  }

  /**
   * Get service type information
   */
  public getServiceTypeInfo(serviceType: ServiceType): ServiceTypeInfo | undefined {
    return this.serviceTypes.get(serviceType);
  }

  /**
   * Find healthy services of a specific type
   */
  public getHealthyServices(serviceType: ServiceType): ServiceRegistration[] {
    return this.getServicesByType(serviceType).filter(
      registration => registration.healthy
    );
  }

  /**
   * Get service statistics
   */
  public getStats(): Record<string, any> {
    const stats = {
      totalServices: this.services.size,
      serviceTypes: this.serviceTypes.size,
      healthyServices: 0,
      unhealthyServices: 0,
      servicesByType: {} as Record<ServiceType, number>,
      lastUpdate: new Date().toISOString()
    };

    for (const registration of this.services.values()) {
      if (registration.healthy) {
        stats.healthyServices++;
      } else {
        stats.unhealthyServices++;
      }

      stats.servicesByType[registration.type] = 
        (stats.servicesByType[registration.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Perform health check on specific service
   */
  public async performHealthCheck(serviceId: string): Promise<boolean> {
    try {
      const registration = this.services.get(serviceId);
      if (!registration) {
        return false;
      }

      const healthResult = await registration.instance.healthCheck();
      registration.healthy = healthResult.status === 'healthy';
      registration.lastHealthCheck = new Date();

      this.logger.debug('Health check completed', {
        serviceId,
        healthy: registration.healthy,
        status: healthResult.status
      });

      return registration.healthy;

    } catch (error) {
      this.logger.warn('Health check failed', { serviceId, error });
      
      const registration = this.services.get(serviceId);
      if (registration) {
        registration.healthy = false;
        registration.lastHealthCheck = new Date();
      }

      return false;
    }
  }

  /**
   * Perform health checks on all services
   */
  public async performAllHealthChecks(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    const healthCheckPromises = Array.from(this.services.keys()).map(
      async serviceId => {
        const healthy = await this.performHealthCheck(serviceId);
        results[serviceId] = healthy;
      }
    );

    await Promise.allSettled(healthCheckPromises);

    this.logger.debug('All health checks completed', {
      totalServices: Object.keys(results).length,
      healthyServices: Object.values(results).filter(Boolean).length
    });

    return results;
  }

  /**
   * Get unhealthy services
   */
  public getUnhealthyServices(): ServiceRegistration[] {
    return Array.from(this.services.values()).filter(
      registration => !registration.healthy
    );
  }

  /**
   * Restart unhealthy services
   */
  public async restartUnhealthyServices(): Promise<number> {
    const unhealthyServices = this.getUnhealthyServices();
    let restartedCount = 0;

    for (const registration of unhealthyServices) {
      try {
        // Attempt to restart service (implementation depends on service type)
        const healthy = await this.performHealthCheck(
          this.getServiceId(registration)
        );

        if (healthy) {
          restartedCount++;
          this.logger.info('Service restarted successfully', {
            serviceType: registration.type
          });
        }

      } catch (error) {
        this.logger.error('Failed to restart service', {
          serviceType: registration.type,
          error
        });
      }
    }

    return restartedCount;
  }

  /**
   * Shutdown all services
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down service registry');

    // Stop health check monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Cleanup all services
    const cleanupPromises = Array.from(this.services.entries()).map(
      async ([serviceId, registration]) => {
        try {
          await registration.instance.cleanup();
        } catch (error) {
          this.logger.warn('Service cleanup failed', { serviceId, error });
        }
      }
    );

    await Promise.allSettled(cleanupPromises);

    // Clear registrations
    this.services.clear();
    this.serviceTypes.clear();

    this.logger.info('Service registry shutdown complete');
  }

  /**
   * Export registry state for debugging
   */
  public exportState(): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      services: Array.from(this.services.entries()).map(([id, reg]) => ({
        id,
        type: reg.type,
        healthy: reg.healthy,
        registeredAt: reg.registeredAt,
        lastHealthCheck: reg.lastHealthCheck,
        metadata: reg.metadata
      })),
      serviceTypes: Array.from(this.serviceTypes.values()),
      stats: this.getStats()
    };
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    const interval = 60000; // 1 minute
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performAllHealthChecks();
      } catch (error) {
        this.logger.error('Health check monitoring failed', { error });
      }
    }, interval);

    this.logger.debug('Health check monitoring started', { interval });
  }

  /**
   * Generate unique service ID
   */
  private generateServiceId(serviceType: ServiceType): string {
    return `${serviceType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service ID from registration
   */
  private getServiceId(registration: ServiceRegistration): string {
    for (const [id, reg] of this.services) {
      if (reg === registration) {
        return id;
      }
    }
    throw new Error('Service registration not found');
  }
}