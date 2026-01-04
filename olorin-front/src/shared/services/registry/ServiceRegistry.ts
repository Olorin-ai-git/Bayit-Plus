/**
 * Service Registry
 * Centralized registry for managing microservice instances
 */

import type {
  ServiceConfig,
  ServiceName,
  ServiceRegistration,
  ServiceHealth,
} from '../types/service-types';

export class ServiceRegistry {
  private services: Map<string, ServiceRegistration> = new Map();

  /**
   * Register a service
   */
  register(
    name: ServiceName,
    config: ServiceConfig,
    ServiceClass?: new (baseUrl: string) => any
  ): void {
    const registration: ServiceRegistration = {
      config,
      instance: ServiceClass ? new ServiceClass(config.baseURL) : undefined,
      health: {
        service: name,
        status: 'healthy',
        lastCheck: new Date(),
      },
    };

    this.services.set(name, registration);
  }

  /**
   * Get service instance
   */
  get<T = any>(name: ServiceName): T | undefined {
    const registration = this.services.get(name);
    return registration?.instance as T | undefined;
  }

  /**
   * Get service configuration
   */
  getConfig(name: ServiceName): ServiceConfig | undefined {
    const registration = this.services.get(name);
    return registration?.config;
  }

  /**
   * Get service health
   */
  getHealth(name: ServiceName): ServiceHealth | undefined {
    const registration = this.services.get(name);
    return registration?.health;
  }

  /**
   * Update service health
   */
  updateHealth(
    name: ServiceName,
    health: Partial<ServiceHealth>
  ): void {
    const registration = this.services.get(name);
    if (registration) {
      registration.health = {
        ...registration.health!,
        ...health,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Get all registered services
   */
  getAllServices(): Array<{
    name: string;
    config: ServiceConfig;
    health?: ServiceHealth;
  }> {
    return Array.from(this.services.entries()).map(([name, registration]) => ({
      name,
      config: registration.config,
      health: registration.health,
    }));
  }

  /**
   * Check if service is registered
   */
  has(name: ServiceName): boolean {
    return this.services.has(name);
  }

  /**
   * Unregister a service
   */
  unregister(name: ServiceName): void {
    this.services.delete(name);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Get healthy services count
   */
  getHealthyCount(): number {
    return this.getAllServices().filter(
      (s) => s.health?.status === 'healthy'
    ).length;
  }
}
