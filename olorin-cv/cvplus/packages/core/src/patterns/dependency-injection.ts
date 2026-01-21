/**
 * CVPlus Dependency Injection Container
 * Enables proper cross-layer communication without violating architecture rules
  */

export interface ServiceContainer {
  register<T>(key: string, implementation: T): void;
  get<T>(key: string): T | undefined;
  has(key: string): boolean;
  clear(): void;
}

export class CVPlusDIContainer implements ServiceContainer {
  private services = new Map<string, any>();

  register<T>(key: string, implementation: T): void {
    this.services.set(key, implementation);
  }

  get<T>(key: string): T | undefined {
    return this.services.get(key);
  }

  has(key: string): boolean {
    return this.services.has(key);
  }

  clear(): void {
    this.services.clear();
  }
}

// Global container instance
export const container = new CVPlusDIContainer();

// Service registration helper
export const registerService = <T>(key: string, implementation: T): void => {
  container.register(key, implementation);
};

// Service resolution helper
export const resolveService = <T>(key: string): T => {
  const service = container.get<T>(key);
  if (!service) {
    throw new Error(`Service not found: ${key}`);
  }
  return service;
};

// Optional service resolution helper
export const tryResolveService = <T>(key: string): T | undefined => {
  return container.get<T>(key);
};

// Service keys constants
export const ServiceKeys = {
  SUBSCRIPTION_SERVICE: 'subscriptionService',
  FEATURE_REGISTRY: 'featureRegistry',
  PAYMENT_PROCESSOR: 'paymentProcessor',
  NOTIFICATION_SERVICE: 'notificationService',
  ANALYTICS_TRACKER: 'analyticsTracker'
} as const;

export type ServiceKey = keyof typeof ServiceKeys;