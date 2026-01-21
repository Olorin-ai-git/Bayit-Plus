/**
 * Service Initialization
 * Configuration-driven initialization of all Olorin microservices
 *
 * SYSTEM MANDATE COMPLIANCE: All service URLs from environment variables
 */

import { ServiceRegistry } from '../registry/ServiceRegistry';
import { InvestigationService } from '../services/InvestigationService';
import { AnalyticsService } from '../services/AnalyticsService';
import { getServiceConfig, isServiceEnabled } from '../config/service-config';
import type { ServiceName } from '../types/service-types';

/**
 * Global service registry instance
 */
export const serviceRegistry = new ServiceRegistry();

/**
 * Initialize default services for Olorin microservices
 * All service URLs are loaded from environment variables (SYSTEM MANDATE compliance)
 */
export function initializeServices(): void {
  const servicesToRegister: Array<{
    name: ServiceName;
    ServiceClass?: new (baseUrl: string) => any;
  }> = [
    {
      name: 'investigation',
      ServiceClass: InvestigationService,
    },
    {
      name: 'agent-analytics',
      ServiceClass: AnalyticsService,
    },
    {
      name: 'rag-intelligence',
      // Generic service (no custom class)
    },
    {
      name: 'visualization',
      // Generic service (no custom class)
    },
    {
      name: 'reporting',
      // Generic service (no custom class)
    },
    {
      name: 'core-ui',
      // Generic service (no custom class)
    },
    {
      name: 'design-system',
      // Generic service (no custom class)
    },
  ];

  let registeredCount = 0;

  servicesToRegister.forEach(({ name, ServiceClass }) => {
    // Only register if service is enabled (baseURL is configured)
    // Services can be disabled - this is not an error, just a warning
    try {
      if (isServiceEnabled(name)) {
        const config = getServiceConfig(name);
        serviceRegistry.register(name, config, ServiceClass);
        registeredCount++;
      } else {
        console.warn(
          `[ServiceInit] Service '${name}' not enabled. Set REACT_APP_${name.toUpperCase().replace(/-/g, '_')}_SERVICE_URL to enable.`
        );
        // Mark service as unavailable but don't fail
        serviceRegistry.updateHealth(name, {
          status: 'unavailable',
          message: 'Service URL not configured',
        });
      }
    } catch (error) {
      // Service registration failed - log but continue
      console.error(`[ServiceInit] Failed to register service '${name}':`, error);
      // Mark service as unavailable
      try {
        const config = getServiceConfig(name);
        serviceRegistry.register(name, config, ServiceClass);
        serviceRegistry.updateHealth(name, {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (configError) {
        // Service config itself is invalid - skip this service
        console.warn(`[ServiceInit] Skipping service '${name}' due to configuration error`);
      }
    }
  });

  console.log(
    `🎯 Olorin microservices initialized: ${registeredCount}/${servicesToRegister.length} services registered`
  );
}

/**
 * Get registered service instance
 */
export function getService<T = any>(name: ServiceName): T | undefined {
  return serviceRegistry.get<T>(name);
}

/**
 * Check if all critical services are healthy
 */
export function areCriticalServicesHealthy(): boolean {
  const criticalServices: ServiceName[] = ['investigation', 'core-ui'];

  return criticalServices.every((service) => {
    const health = serviceRegistry.getHealth(service);
    return health?.status === 'healthy';
  });
}
