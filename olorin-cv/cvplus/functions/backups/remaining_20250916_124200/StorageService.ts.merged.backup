// @ts-ignore - Export conflicts/**
 * Storage Service
 * 
 * Unified storage service supporting multiple providers (Firebase, AWS S3, etc.)
 * with features like CDN integration, caching, and intelligent storage optimization.
 */

import { 
  ProcessingOptions,
  ProcessingResult,
  MediaType,
  ServiceConfig
} from '../../types';
import { 
  UploadOptions,
  UploadResult,
  StorageProvider,
  CDNConfig
} from '../../types/storage.types';

import { MediaService } from '../base/MediaService';
import { FirebaseStorageAdapter } from './FirebaseStorageAdapter';
import { S3StorageAdapter } from '../../storage/S3StorageAdapter';
import { CDNManager } from '../../storage/CDNManager';
import { StorageOptimizer } from '../../storage/StorageOptimizer';

/**
 * Main storage service implementation
 * Provides unified interface for multiple storage providers
 */
export class StorageService extends MediaService {
  private readonly adapters: Map<StorageProvider, any>;
  private readonly cdnManager: CDNManager;
  private readonly optimizer: StorageOptimizer;
  private readonly primaryProvider: StorageProvider;

  constructor(config: ServiceConfig) {
    super(config);
    
    this.adapters = new Map();
    this.primaryProvider = config.storage?.primaryProvider || 'firebase';
    
    // Initialize storage adapters
    this.initializeAdapters(config);
    
    // Initialize CDN manager
    this.cdnManager = new CDNManager(config.cdn || {});
    
    // Initialize optimizer
    this.optimizer = new StorageOptimizer(config.optimization || {});
  }

  /**
   * Main storage processing entry point
   */
  public async processMedia(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = performance.now();
    
    try {
      // Preprocess input and options
      const { input: processedInput, processedOptions } = await this.preprocess(input, options);
      const storageOptions = processedOptions as UploadOptions;

      // Upload to storage
      const uploadResult = await this.upload(processedInput, storageOptions);
      
      // Set up CDN if enabled
      let cdnUrl: string | undefined;
      if (storageOptions.enableCDN !== false) {
        cdnUrl = await this.cdnManager.setupCDN(uploadResult.url, storageOptions.cdnConfig);
      }

      // Create processing result
      const processingResult: ProcessingResult = {
        output: uploadResult.url,
        metadata: {
          ...uploadResult.metadata,
          cdnUrl,
          processingTime: performance.now() - startTime,
          provider: storageOptions.provider || this.primaryProvider,
          storageOptions
        }
      };

      return this.postprocess(processingResult, processedOptions);

    } catch (error) {
      this.performanceTracker.recordError('processMedia', error as Error);
      throw this.errorHandler.handleError(error as Error, 'processMedia');
    }
  }

  /**
   * Upload file to storage
   */
  public async upload(
    input: File | Buffer | string,
    options: UploadOptions = {}
  ): Promise<StorageResult> {
    const provider = options.provider || this.primaryProvider;
    const adapter = this.getAdapter(provider);

    if (!adapter) {
      throw new Error(`Storage adapter not found for provider: ${provider}`);
    }

    try {
      // Optimize file before upload if enabled
      let processedInput = input;
      if (options.optimize !== false) {
        processedInput = await this.optimizer.optimize(input, options);
      }

      // Generate storage path
      const storagePath = this.generateStoragePath(processedInput, options);

      // Upload to storage
      const uploadResult = await adapter.upload(processedInput, {
        ...options,
        path: storagePath
      });

      // Update cache if enabled
      if (options.enableCache !== false) {
        await this.updateCache(uploadResult.url, processedInput, options.cacheConfig);
      }

      return uploadResult;

    } catch (error) {
      this.logger.error(`Upload failed for provider ${provider}`, { error });
      
      // Try fallback provider if configured
      if (options.fallbackProvider && options.fallbackProvider !== provider) {
        this.logger.info(`Trying fallback provider: ${options.fallbackProvider}`);
        return this.upload(input, { ...options, provider: options.fallbackProvider });
      }

      throw error;
    }
  }

  /**
   * Download file from storage
   */
  public async download(
    url: string,
    options: UploadOptions = {}
  ): Promise<Buffer> {
    // Check cache first
    if (options.enableCache !== false) {
      const cached = await this.getFromCache(url, options.cacheConfig);
      if (cached) {
        this.logger.debug('File retrieved from cache', { url });
        return cached;
      }
    }

    const provider = this.detectProvider(url) || options.provider || this.primaryProvider;
    const adapter = this.getAdapter(provider);

    if (!adapter) {
      throw new Error(`Storage adapter not found for provider: ${provider}`);
    }

    try {
      const buffer = await adapter.download(url, options);
      
      // Update cache
      if (options.enableCache !== false) {
        await this.updateCache(url, buffer, options.cacheConfig);
      }

      return buffer;

    } catch (error) {
      this.logger.error(`Download failed from ${provider}`, { error, url });
      throw error;
    }
  }

  /**
   * Delete file from storage
   */
  public async delete(
    url: string,
    options: UploadOptions = {}
  ): Promise<boolean> {
    const provider = this.detectProvider(url) || options.provider || this.primaryProvider;
    const adapter = this.getAdapter(provider);

    if (!adapter) {
      throw new Error(`Storage adapter not found for provider: ${provider}`);
    }

    try {
      const result = await adapter.delete(url, options);
      
      // Remove from cache
      if (options.enableCache !== false) {
        await this.removeFromCache(url, options.cacheConfig);
      }

      // Remove from CDN
      if (options.enableCDN !== false) {
        await this.cdnManager.invalidate(url);
      }

      return result;

    } catch (error) {
      this.logger.error(`Delete failed from ${provider}`, { error, url });
      throw error;
    }
  }

  /**
   * List files in storage
   */
  public async list(
    prefix: string,
    options: UploadOptions = {}
  ): Promise<StorageResult[]> {
    const provider = options.provider || this.primaryProvider;
    const adapter = this.getAdapter(provider);

    if (!adapter) {
      throw new Error(`Storage adapter not found for provider: ${provider}`);
    }

    return adapter.list(prefix, options);
  }

  /**
   * Get file metadata without downloading
   */
  public async getMetadata(
    url: string,
    options: UploadOptions = {}
  ): Promise<Record<string, any>> {
    const provider = this.detectProvider(url) || options.provider || this.primaryProvider;
    const adapter = this.getAdapter(provider);

    if (!adapter) {
      throw new Error(`Storage adapter not found for provider: ${provider}`);
    }

    return adapter.getMetadata(url, options);
  }

  /**
   * Generate signed URL for private files
   */
  public async getSignedUrl(
    url: string,
    options: UploadOptions & { expiresIn?: number } = {}
  ): Promise<string> {
    const provider = this.detectProvider(url) || options.provider || this.primaryProvider;
    const adapter = this.getAdapter(provider);

    if (!adapter) {
      throw new Error(`Storage adapter not found for provider: ${provider}`);
    }

    return adapter.getSignedUrl(url, options);
  }

  /**
   * Copy file between storage locations
   */
  public async copy(
    sourceUrl: string,
    destinationPath: string,
    options: UploadOptions = {}
  ): Promise<StorageResult> {
    const sourceProvider = this.detectProvider(sourceUrl) || options.provider || this.primaryProvider;
    const destProvider = options.destinationProvider || sourceProvider;

    if (sourceProvider === destProvider) {
      // Same provider copy
      const adapter = this.getAdapter(sourceProvider);
      return adapter.copy(sourceUrl, destinationPath, options);
    } else {
      // Cross-provider copy (download then upload)
      const buffer = await this.download(sourceUrl, { provider: sourceProvider });
      return this.upload(buffer, { 
        ...options, 
        provider: destProvider,
        path: destinationPath 
      });
    }
  }

  /**
   * Move file to different location
   */
  public async move(
    sourceUrl: string,
    destinationPath: string,
    options: UploadOptions = {}
  ): Promise<StorageResult> {
    // Copy to new location
    const result = await this.copy(sourceUrl, destinationPath, options);
    
    // Delete from original location
    await this.delete(sourceUrl, options);
    
    return result;
  }

  /**
   * Validate storage input
   */
  public async validateInput(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<boolean> {
    try {
      const storageOptions = options as UploadOptions;
      
      // Check provider availability
      const provider = storageOptions.provider || this.primaryProvider;
      const adapter = this.getAdapter(provider);
      
      if (!adapter) {
        throw new Error(`Storage adapter not available: ${provider}`);
      }

      // Check file size limits
      const size = this.getInputSize(input);
      const maxSize = storageOptions.maxFileSize || this.config.storage?.maxFileSize || 100 * 1024 * 1024;
      
      if (size > maxSize) {
        throw new Error(`File size ${size} exceeds maximum ${maxSize}`);
      }

      // Validate storage path
      if (storageOptions.path && !this.isValidStoragePath(storageOptions.path)) {
        throw new Error(`Invalid storage path: ${storageOptions.path}`);
      }

      return true;

    } catch (error) {
      this.logger.warn('Storage validation failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get supported media types
   */
  public getSupportedTypes(): MediaType[] {
    return ['image', 'video', 'audio']; // Storage supports all media types
  }

  /**
   * Get service capabilities
   */
  public getCapabilities(): Record<string, any> {
    const capabilities: Record<string, any> = {
      providers: Array.from(this.adapters.keys()),
      primaryProvider: this.primaryProvider,
      features: {
        multiProvider: true,
        cdn: this.cdnManager.isEnabled(),
        caching: true,
        optimization: true,
        signedUrls: true,
        crossProviderCopy: true
      }
    };

    // Add provider-specific capabilities
    this.adapters.forEach((adapter, provider) => {
      if (adapter.getCapabilities) {
        capabilities[provider] = adapter.getCapabilities();
      }
    });

    return capabilities;
  }

  /**
   * Initialize storage adapters
   */
  private initializeAdapters(config: ServiceConfig): void {
    // Initialize Firebase adapter
    if (config.storage?.providers?.firebase) {
      this.adapters.set('firebase', new FirebaseStorageAdapter(config.storage.providers.firebase));
    }

    // Initialize S3 adapter
    if (config.storage?.providers?.s3) {
      this.adapters.set('s3', new S3StorageAdapter(config.storage.providers.s3));
    }

    // Ensure at least one adapter is available
    if (this.adapters.size === 0) {
      throw new Error('No storage adapters configured');
    }
  }

  /**
   * Get storage adapter for provider
   */
  private getAdapter(provider: StorageProvider): any {
    return this.adapters.get(provider);
  }

  /**
   * Detect provider from URL
   */
  private detectProvider(url: string): StorageProvider | null {
    if (url.includes('firebasestorage.googleapis.com')) {
      return 'firebase';
    }
    if (url.includes('amazonaws.com') || url.includes('s3.')) {
      return 's3';
    }
    return null;
  }

  /**
   * Generate storage path for file
   */
  private generateStoragePath(
    input: File | Buffer | string,
    options: UploadOptions
  ): string {
    if (options.path) {
      return options.path;
    }

    // Generate path based on file type and timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const mediaType = this.detectMediaType(input);
    const extension = this.getFileExtension(input);
    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension}`;

    return `${options.basePath || 'multimedia'}/${mediaType}/${timestamp}/${filename}`;
  }

  /**
   * Detect media type from input
   */
  private detectMediaType(input: File | Buffer | string): string {
    if (input instanceof File) {
      const type = input.type;
      if (type.startsWith('image/')) return 'images';
      if (type.startsWith('video/')) return 'videos';
      if (type.startsWith('audio/')) return 'audio';
    }
    return 'files';
  }

  /**
   * Get file extension from input
   */
  private getFileExtension(input: File | Buffer | string): string {
    if (input instanceof File) {
      const name = input.name;
      const lastDot = name.lastIndexOf('.');
      return lastDot > -1 ? name.substring(lastDot) : '';
    }
    return '';
  }

  /**
   * Validate storage path
   */
  private isValidStoragePath(path: string): boolean {
    // Basic path validation
    return !path.includes('..') && !path.startsWith('/') && path.length > 0;
  }

  /**
   * Get input size in bytes
   */
  private getInputSize(input: File | Buffer | string): number {
    if (Buffer.isBuffer(input)) {
      return input.length;
    }
    if (input instanceof File) {
      return input.size;
    }
    return 0;
  }

  /**
   * Update cache with file
   */
  private async updateCache(
    url: string,
    data: File | Buffer | string,
    cacheConfig?: CacheConfig
  ): Promise<void> {
    // Cache implementation would go here
    // For now, this is a placeholder
  }

  /**
   * Get file from cache
   */
  private async getFromCache(
    url: string,
    cacheConfig?: CacheConfig
  ): Promise<Buffer | null> {
    // Cache retrieval implementation would go here
    // For now, this is a placeholder
    return null;
  }

  /**
   * Remove file from cache
   */
  private async removeFromCache(
    url: string,
    cacheConfig?: CacheConfig
  ): Promise<void> {
    // Cache removal implementation would go here
    // For now, this is a placeholder
  }
}