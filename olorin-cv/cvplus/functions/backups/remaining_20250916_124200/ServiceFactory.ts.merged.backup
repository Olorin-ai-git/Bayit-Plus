// @ts-ignore - Export conflicts/**
 * Multimedia Service Factory
 * 
 * Provides centralized creation and management of multimedia services
 * with dependency injection, configuration management, and lifecycle control.
 */

import { 
  MediaService,
  ServiceConfig,
  ServiceType,
  MediaType,
  ProcessingCapabilities 
} from '../../types';

import { ImageService } from '../image/ImageService';
import { VideoService } from '../video/VideoService';
import { AudioService } from '../audio/AudioService';
import { StorageService } from '../storage/StorageService';
import { JobManager } from '../jobs/JobManager';

import { Logger } from '../utils/Logger';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { ConfigManager } from '../config/ConfigManager';

/**
 * Factory class for creating and managing multimedia services
 * Implements singleton pattern and service lifecycle management
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private readonly logger: Logger;
  private readonly serviceRegistry: ServiceRegistry;
  private readonly configManager: ConfigManager;
  private readonly serviceInstances: Map<string, MediaService>;
  private initialized: boolean = false;

  private constructor() {
    this.logger = new Logger('ServiceFactory');
    this.serviceRegistry = ServiceRegistry.getInstance();
    this.configManager = new ConfigManager();
    this.serviceInstances = new Map();
  }

  /**
   * Get singleton instance of ServiceFactory
   */
  public static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * Initialize the service factory with configuration
   */
  public async initialize(config?: Partial<ServiceConfig>): Promise<void> {
    if (this.initialized) {
      this.logger.warn('ServiceFactory already initialized');
      return;
    }

    try {
      // Load configuration
      await this.configManager.loadConfig(config);
      
      // Register default services
      await this.registerDefaultServices();
      
      // Initialize service registry
      await this.serviceRegistry.initialize();
      
      this.initialized = true;
      this.logger.info('ServiceFactory initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize ServiceFactory', { error });
      throw error;
    }
  }

  /**
   * Create a media service by type
   */
  public async createService<T extends MediaService>(
    serviceType: ServiceType,
    config?: Partial<ServiceConfig>
  ): Promise<T> {
    if (!this.initialized) {
      throw new Error('ServiceFactory not initialized. Call initialize() first.');
    }

    const serviceKey = `${serviceType}-${JSON.stringify(config || {})}`;
    
    // Return existing instance if available
    if (this.serviceInstances.has(serviceKey)) {
      return this.serviceInstances.get(serviceKey) as T;
    }

    try {
      // Merge configuration
      const serviceConfig = await this.configManager.getServiceConfig(serviceType, config);
      
      // Create service instance
      const service = await this.instantiateService<T>(serviceType, serviceConfig);
      
      // Register and cache service
      this.serviceInstances.set(serviceKey, service);
      await this.serviceRegistry.registerService(serviceType, service);
      
      this.logger.info(`Created ${serviceType} service`, { config: serviceConfig });
      return service;

    } catch (error) {
      this.logger.error(`Failed to create ${serviceType} service`, { error });
      throw error;
    }
  }

  /**
   * Get service by type (creates if not exists)
   */
  public async getService<T extends MediaService>(
    serviceType: ServiceType,
    config?: Partial<ServiceConfig>
  ): Promise<T> {
    return this.createService<T>(serviceType, config);
  }

  /**
   * Get image processing service
   */
  public async getImageService(config?: Partial<ServiceConfig>): Promise<ImageService> {
    return this.getService<ImageService>('image', config);
  }

  /**
   * Get video processing service
   */
  public async getVideoService(config?: Partial<ServiceConfig>): Promise<VideoService> {
    return this.getService<VideoService>('video', config);
  }

  /**
   * Get audio processing service
   */
  public async getAudioService(config?: Partial<ServiceConfig>): Promise<AudioService> {
    return this.getService<AudioService>('audio', config);
  }

  /**
   * Get storage service
   */
  public async getStorageService(config?: Partial<ServiceConfig>): Promise<StorageService> {
    return this.getService<StorageService>('storage', config);
  }

  /**
   * Get job manager service
   */
  public async getJobManager(config?: Partial<ServiceConfig>): Promise<JobManager> {
    return this.getService<JobManager>('jobs', config);
  }

  /**
   * Create service for specific media type
   */
  public async getServiceForMediaType(
    mediaType: MediaType,
    config?: Partial<ServiceConfig>
  ): Promise<MediaService> {
    switch (mediaType) {
      case 'image':
        return this.getImageService(config);
      case 'video':
        return this.getVideoService(config);
      case 'audio':
        return this.getAudioService(config);
      default:
        throw new Error(`No service available for media type: ${mediaType}`);
    }
  }

  /**
   * Get all available services
   */
  public getAvailableServices(): ServiceType[] {
    return this.serviceRegistry.getRegisteredServices();
  }

  /**
   * Get service capabilities
   */
  public async getServiceCapabilities(serviceType: ServiceType): Promise<ProcessingCapabilities> {
    const service = await this.getService(serviceType);
    return service.getCapabilities();
  }

  /**
   * Health check for all services
   */
  public async healthCheck(): Promise<Record<ServiceType, any>> {
    const healthStatus: Record<string, any> = {};

    for (const [key, service] of this.serviceInstances) {
      try {
        const health = await service.healthCheck();
        healthStatus[key] = health;
      } catch (error) {
        healthStatus[key] = {
          status: 'unhealthy',
          error: (error as Error).message
        };
      }
    }

    return healthStatus;
  }

  /**
   * Shutdown all services
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down all services...');

    const shutdownPromises = Array.from(this.serviceInstances.values()).map(
      async (service) => {
        try {
          await service.cleanup();
        } catch (error) {
          this.logger.error('Error during service cleanup', { error });
        }
      }
    );

    await Promise.allSettled(shutdownPromises);
    
    this.serviceInstances.clear();
    this.initialized = false;
    
    this.logger.info('All services shut down successfully');
  }

  /**
   * Instantiate service based on type
   */
  private async instantiateService<T extends MediaService>(
    serviceType: ServiceType,
    config: ServiceConfig
  ): Promise<T> {
    switch (serviceType) {
      case 'image':
        return new ImageService(config) as T;
      
      case 'video':
        return new VideoService(config) as T;
      
      case 'audio':
        return new AudioService(config) as T;
      
      case 'storage':
        return new StorageService(config) as T;
      
      case 'jobs':
        return new JobManager(config) as T;
      
      default:
        throw new Error(`Unknown service type: ${serviceType}`);
    }
  }

  /**
   * Register default service configurations
   */
  private async registerDefaultServices(): Promise<void> {
    const defaultServices: ServiceType[] = ['image', 'video', 'audio', 'storage', 'jobs'];
    
    for (const serviceType of defaultServices) {
      try {
        const defaultConfig = await this.configManager.getDefaultServiceConfig(serviceType);
        await this.serviceRegistry.registerServiceType(serviceType, defaultConfig);
      } catch (error) {
        this.logger.warn(`Failed to register default ${serviceType} service`, { error });
      }
    }
  }

  /**
   * Clear service cache (for testing/development)
   */
  public clearCache(): void {
    this.serviceInstances.clear();
    this.logger.info('Service cache cleared');
  }

  /**
   * Get service instance count
   */
  public getServiceCount(): number {
    return this.serviceInstances.size;
  }

  /**
   * Get service statistics
   */
  public getServiceStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    this.serviceInstances.forEach((service, key) => {
      stats[key] = {
        type: service.constructor.name,
        capabilities: service.getCapabilities(),
        performance: service.getPerformanceMetrics()
      };
    });

    return stats;
  }
}