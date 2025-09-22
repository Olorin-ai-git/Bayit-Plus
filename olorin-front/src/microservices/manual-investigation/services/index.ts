import { ServiceConfig } from '../types';

// Base services
export { ApiService } from './ApiService';
export { WebSocketService } from './WebSocketService';

// Core API services
export { InvestigationService } from './InvestigationService';

// Service configuration factory
export function createServiceConfig(overrides: Partial<ServiceConfig> = {}): ServiceConfig {
  const defaultConfig: ServiceConfig = {
    api_base_url: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090',
    websocket_url: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8090/ws',
    timeout_ms: 30000,
    retry_attempts: 3,
    retry_delay_ms: 1000,
    enable_real_time: true,
    debug_mode: process.env.NODE_ENV === 'development',
  };

  return { ...defaultConfig, ...overrides };
}

// Service factory class for dependency injection
export class ServiceFactory {
  private config: ServiceConfig;
  private services: Map<string, any> = new Map();

  constructor(config?: Partial<ServiceConfig>) {
    this.config = createServiceConfig(config);
  }

  /**
   * Get or create InvestigationService instance
   */
  getInvestigationService(): InvestigationService {
    if (!this.services.has('investigation')) {
      this.services.set('investigation', new InvestigationService(this.config));
    }
    return this.services.get('investigation');
  }

  /**
   * Get or create WebSocketService instance
   */
  getWebSocketService(): WebSocketService {
    if (!this.services.has('websocket')) {
      this.services.set('websocket', new WebSocketService(this.config));
    }
    return this.services.get('websocket');
  }

  /**
   * Update configuration for all services
   */
  updateConfig(newConfig: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update configuration for existing services
    this.services.forEach((service) => {
      if (service.updateConfig) {
        service.updateConfig(this.config);
      }
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  /**
   * Clear all service instances (useful for testing)
   */
  clearServices(): void {
    // Properly dispose of WebSocket connections
    const wsService = this.services.get('websocket');
    if (wsService) {
      wsService.disconnect();
    }

    this.services.clear();
  }
}

// Default service factory instance
export const defaultServiceFactory = new ServiceFactory();

// Convenience exports for common services
export const investigationService = defaultServiceFactory.getInvestigationService();
export const webSocketService = defaultServiceFactory.getWebSocketService();

// Service hooks for React components (if needed)
export function useServices() {
  return {
    investigation: defaultServiceFactory.getInvestigationService(),
    websocket: defaultServiceFactory.getWebSocketService(),
  };
}

// Environment-specific service configuration
export function getServiceConfigForEnvironment(environment: 'development' | 'staging' | 'production'): ServiceConfig {
  const baseConfig = createServiceConfig();

  switch (environment) {
    case 'development':
      return {
        ...baseConfig,
        api_base_url: 'http://localhost:8090',
        websocket_url: 'ws://localhost:8090/ws',
        debug_mode: true,
        timeout_ms: 30000,
        retry_attempts: 2,
      };

    case 'staging':
      return {
        ...baseConfig,
        api_base_url: 'https://staging-api.olorin.app',
        websocket_url: 'wss://staging-api.olorin.app/ws',
        debug_mode: false,
        timeout_ms: 15000,
        retry_attempts: 3,
      };

    case 'production':
      return {
        ...baseConfig,
        api_base_url: 'https://api.olorin.app',
        websocket_url: 'wss://api.olorin.app/ws',
        debug_mode: false,
        timeout_ms: 10000,
        retry_attempts: 5,
        retry_delay_ms: 2000,
      };

    default:
      return baseConfig;
  }
}