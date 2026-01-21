/**
 * TestEnvironment entity model
 * Defines configuration and deployment context for test execution.
  */

export interface ServiceEndpoint {
  name: string;
  url: string;
  version: string;
  authentication: AuthConfig;
  timeout: number;
  rateLimit: RateLimitConfig;
}

export interface AuthConfig {
  type: 'none' | 'apikey' | 'bearer' | 'basic' | 'oauth';
  credentials: Record<string, string>;
  headers?: Record<string, string>;
  refreshUrl?: string;
  expiresAt?: Date;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  burstLimit: number;
  retryAfterMs: number;
}

export interface EnvironmentCredentials {
  encrypted: boolean;
  credentials: Record<string, string>;
  keyId?: string;
  lastRotated?: Date;
  expiresAt?: Date;
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  value?: any;
  conditions?: Record<string, any>;
  rolloutPercentage?: number;
}

export interface ResourceLimits {
  maxConcurrentTests: number;
  maxMemoryMB: number;
  maxExecutionTimeMs: number;
  maxFileUploadMB: number;
  maxApiCallsPerMinute: number;
  maxStorageGB: number;
}

export interface MockConfiguration {
  enabled: boolean;
  serviceEndpoints: string[];
  responseDelay: number;
  errorRate: number;
  fallbackToReal: boolean;
  mockDataPath?: string;
}

export type EnvironmentType = 'local' | 'dev' | 'staging' | 'prod' | 'ci';

export interface TestEnvironment {
  id: string;
  name: string;
  type: EnvironmentType;
  baseUrl: string;
  services: ServiceEndpoint[];
  credentials: EnvironmentCredentials;
  features: FeatureFlag[];
  limits: ResourceLimits;
  mockConfig: MockConfiguration;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class TestEnvironmentModel implements TestEnvironment {
  public readonly id: string;
  public name: string;
  public type: EnvironmentType;
  public baseUrl: string;
  public services: ServiceEndpoint[];
  public credentials: EnvironmentCredentials;
  public features: FeatureFlag[];
  public limits: ResourceLimits;
  public mockConfig: MockConfiguration;
  public isActive: boolean;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(data: Omit<TestEnvironment, 'createdAt' | 'updatedAt'>) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.baseUrl = data.baseUrl;
    this.services = data.services;
    this.credentials = data.credentials;
    this.features = data.features;
    this.limits = data.limits;
    this.mockConfig = data.mockConfig;
    this.isActive = data.isActive;
    this.createdAt = new Date();
    this.updatedAt = new Date();

    this.validate();
  }

  public validate(): void {
    if (!this.name?.trim()) {
      throw new Error('TestEnvironment name is required');
    }

    if (!this.isValidUrl(this.baseUrl)) {
      throw new Error('Base URL must be valid and accessible');
    }

    // Validate service endpoints
    for (const service of this.services) {
      if (!this.isValidUrl(service.url)) {
        throw new Error(`Service ${service.name} URL must be valid`);
      }

      if (service.timeout <= 0 || service.timeout > 300000) { // Max 5 minutes
        throw new Error(`Service ${service.name} timeout must be between 1ms and 5 minutes`);
      }
    }

    this.validateResourceLimits();
    this.validateMockConfiguration();

    // Validate credentials encryption for production
    if (this.type === 'prod' && !this.credentials.encrypted) {
      throw new Error('Production environment credentials must be encrypted');
    }

    // Check for expired credentials
    if (this.credentials.expiresAt && this.credentials.expiresAt <= new Date()) {
      throw new Error('Environment credentials have expired');
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  private validateResourceLimits(): void {
    const { limits } = this;

    if (limits.maxConcurrentTests <= 0 || limits.maxConcurrentTests > 1000) {
      throw new Error('Max concurrent tests must be between 1 and 1000');
    }

    if (limits.maxMemoryMB <= 0 || limits.maxMemoryMB > 32768) { // Max 32GB
      throw new Error('Max memory must be between 1MB and 32GB');
    }

    if (limits.maxExecutionTimeMs <= 1000 || limits.maxExecutionTimeMs > 7200000) { // Max 2 hours
      throw new Error('Max execution time must be between 1 second and 2 hours');
    }

    if (limits.maxFileUploadMB <= 0 || limits.maxFileUploadMB > 1024) { // Max 1GB
      throw new Error('Max file upload must be between 1MB and 1GB');
    }

    if (limits.maxApiCallsPerMinute <= 0 || limits.maxApiCallsPerMinute > 100000) {
      throw new Error('Max API calls per minute must be between 1 and 100,000');
    }

    if (limits.maxStorageGB <= 0 || limits.maxStorageGB > 10240) { // Max 10TB
      throw new Error('Max storage must be between 1GB and 10TB');
    }
  }

  private validateMockConfiguration(): void {
    if (!this.mockConfig.enabled) {
      return;
    }

    if (this.mockConfig.responseDelay < 0 || this.mockConfig.responseDelay > 60000) {
      throw new Error('Mock response delay must be between 0ms and 60 seconds');
    }

    if (this.mockConfig.errorRate < 0 || this.mockConfig.errorRate > 100) {
      throw new Error('Mock error rate must be between 0% and 100%');
    }

    // Validate that mocked services exist in the services list
    for (const mockedService of this.mockConfig.serviceEndpoints) {
      if (!this.services.some(service => service.name === mockedService)) {
        throw new Error(`Mock service ${mockedService} not found in services list`);
      }
    }
  }

  public addService(service: ServiceEndpoint): void {
    // Check for duplicate service names
    if (this.services.some(s => s.name === service.name)) {
      throw new Error(`Service ${service.name} already exists`);
    }

    this.services.push(service);
    this.updatedAt = new Date();
    this.validate();
  }

  public removeService(serviceName: string): void {
    const initialLength = this.services.length;
    this.services = this.services.filter(service => service.name !== serviceName);

    if (this.services.length === initialLength) {
      throw new Error(`Service ${serviceName} not found`);
    }

    // Remove from mock configuration if present
    this.mockConfig.serviceEndpoints = this.mockConfig.serviceEndpoints.filter(
      name => name !== serviceName
    );

    this.updatedAt = new Date();
  }

  public updateService(serviceName: string, updates: Partial<ServiceEndpoint>): void {
    const serviceIndex = this.services.findIndex(service => service.name === serviceName);
    if (serviceIndex === -1) {
      throw new Error(`Service ${serviceName} not found`);
    }

    this.services[serviceIndex] = { ...this.services[serviceIndex], ...updates };
    this.updatedAt = new Date();
    this.validate();
  }

  public addFeatureFlag(flag: FeatureFlag): void {
    // Check for duplicate feature names
    if (this.features.some(f => f.name === flag.name)) {
      throw new Error(`Feature flag ${flag.name} already exists`);
    }

    this.features.push(flag);
    this.updatedAt = new Date();
  }

  public updateFeatureFlag(flagName: string, updates: Partial<FeatureFlag>): void {
    const flagIndex = this.features.findIndex(flag => flag.name === flagName);
    if (flagIndex === -1) {
      throw new Error(`Feature flag ${flagName} not found`);
    }

    this.features[flagIndex] = { ...this.features[flagIndex], ...updates };
    this.updatedAt = new Date();
  }

  public isFeatureEnabled(flagName: string): boolean {
    const flag = this.features.find(f => f.name === flagName);
    if (!flag) return false;

    if (!flag.enabled) return false;

    // Check rollout percentage if specified
    if (flag.rolloutPercentage !== undefined) {
      const random = Math.random() * 100;
      return random <= flag.rolloutPercentage;
    }

    return true;
  }

  public getService(serviceName: string): ServiceEndpoint | undefined {
    return this.services.find(service => service.name === serviceName);
  }

  public activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  public deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  public toJSON(): TestEnvironment {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      baseUrl: this.baseUrl,
      services: this.services,
      credentials: this.credentials,
      features: this.features,
      limits: this.limits,
      mockConfig: this.mockConfig,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  public static fromJSON(data: any): TestEnvironmentModel {
    const environment = new TestEnvironmentModel({
      id: data.id,
      name: data.name,
      type: data.type,
      baseUrl: data.baseUrl,
      services: data.services.map((service: any) => ({
        ...service,
        authentication: {
          ...service.authentication,
          expiresAt: service.authentication.expiresAt
            ? new Date(service.authentication.expiresAt)
            : undefined
        }
      })),
      credentials: {
        ...data.credentials,
        lastRotated: data.credentials.lastRotated
          ? new Date(data.credentials.lastRotated)
          : undefined,
        expiresAt: data.credentials.expiresAt
          ? new Date(data.credentials.expiresAt)
          : undefined
      },
      features: data.features,
      limits: data.limits,
      mockConfig: data.mockConfig,
      isActive: data.isActive
    });

    if (data.createdAt) {
      (environment as any).createdAt = new Date(data.createdAt);
    }
    if (data.updatedAt) {
      environment.updatedAt = new Date(data.updatedAt);
    }

    return environment;
  }
}

export default TestEnvironmentModel;