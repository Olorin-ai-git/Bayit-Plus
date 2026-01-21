// @ts-ignore - Export conflicts/**
 * Base Media Service Class
 * 
 * Provides common functionality and interface for all multimedia services
 * including logging, error handling, performance monitoring, and validation.
 */

import { 
  MediaService as IMediaService,
  ProcessingOptions,
  ProcessingResult,
  MultimediaError,
  MediaType,
  ServiceConfig,
  LogLevel
} from '../../types';

import { ErrorHandler } from './ErrorHandler';
import { Logger } from '../utils/Logger';
import { PerformanceTracker } from '../utils/PerformanceTracker';
import { ValidationService } from '../security/ValidationService';

/**
 * Abstract base class for all multimedia services
 * Implements common patterns for processing, validation, and monitoring
 */
export abstract class MediaService implements IMediaService {
  protected readonly logger: Logger;
  protected readonly errorHandler: ErrorHandler;
  protected readonly performanceTracker: PerformanceTracker;
  protected readonly validator: ValidationService;
  protected readonly config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.logger = new Logger(this.constructor.name);
    this.errorHandler = new ErrorHandler(config.errorHandling || {});
    this.performanceTracker = new PerformanceTracker();
    this.validator = new ValidationService(config.validation || {});
  }

  /**
   * Abstract method for processing media files
   * Must be implemented by concrete service classes
   */
  abstract processMedia(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<ProcessingResult>;

  /**
   * Abstract method for validating input before processing
   */
  abstract validateInput(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<boolean>;

  /**
   * Get supported media types for this service
   */
  abstract getSupportedTypes(): MediaType[];

  /**
   * Get service capabilities and limitations
   */
  abstract getCapabilities(): Record<string, any>;

  /**
   * Common preprocessing pipeline
   */
  protected async preprocess(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<{ input: File | Buffer | string; processedOptions: ProcessingOptions }> {
    const startTime = performance.now();
    
    try {
      // Input validation
      const isValid = await this.validateInput(input, options);
      if (!isValid) {
        throw new MultimediaError('Invalid input provided', 'VALIDATION_ERROR');
      }

      // Security scanning
      await this.scanForSecurity(input);

      // Option preprocessing
      const processedOptions = await this.preprocessOptions(options);

      // Log preprocessing completion
      this.logger.info('Preprocessing completed', {
        processingTime: performance.now() - startTime,
        inputType: typeof input,
        options: processedOptions
      });

      return { input, processedOptions };

    } catch (error) {
      this.performanceTracker.recordError('preprocess', error as Error);
      throw this.errorHandler.handleError(error as Error, 'preprocess');
    }
  }

  /**
   * Common postprocessing pipeline
   */
  protected async postprocess(
    result: ProcessingResult,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = performance.now();

    try {
      // Quality validation
      await this.validateResult(result);

      // Metadata enhancement
      const enhancedResult = await this.enhanceResultMetadata(result, options);

      // Performance metrics
      const processingTime = performance.now() - startTime;
      enhancedResult.metadata = {
        ...enhancedResult.metadata,
        processingTime,
        processedAt: new Date().toISOString(),
        serviceVersion: this.config.version || '1.0.0'
      };

      this.logger.info('Postprocessing completed', {
        processingTime,
        resultSize: this.getResultSize(enhancedResult),
        metadata: enhancedResult.metadata
      });

      return enhancedResult;

    } catch (error) {
      this.performanceTracker.recordError('postprocess', error as Error);
      throw this.errorHandler.handleError(error as Error, 'postprocess');
    }
  }

  /**
   * Security scanning for input files
   */
  protected async scanForSecurity(input: File | Buffer | string): Promise<void> {
    if (this.config.security?.enableScanning === false) {
      return;
    }

    try {
      // File signature validation
      await this.validator.validateFileSignature(input);

      // Malware scanning (if enabled)
      if (this.config.security?.enableMalwareScanning) {
        await this.validator.scanForMalware(input);
      }

      // Content validation
      await this.validator.validateContent(input);

    } catch (error) {
      throw new MultimediaError(
        `Security validation failed: ${(error as Error).message}`,
        'SECURITY_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Preprocess and validate options
   */
  protected async preprocessOptions(options: ProcessingOptions): Promise<ProcessingOptions> {
    const processedOptions = { ...options };

    // Set defaults
    processedOptions.quality = processedOptions.quality || this.config.defaultQuality || 85;
    processedOptions.timeout = processedOptions.timeout || this.config.defaultTimeout || 30000;
    
    // Validate ranges
    if (processedOptions.quality < 1 || processedOptions.quality > 100) {
      throw new MultimediaError('Quality must be between 1 and 100', 'VALIDATION_ERROR');
    }

    // Add service-specific preprocessing
    return this.serviceSpecificOptionPreprocessing(processedOptions);
  }

  /**
   * Service-specific option preprocessing (override in subclasses)
   */
  protected async serviceSpecificOptionPreprocessing(
    options: ProcessingOptions
  ): Promise<ProcessingOptions> {
    return options;
  }

  /**
   * Validate processing result
   */
  protected async validateResult(result: ProcessingResult): Promise<void> {
    if (!result.output) {
      throw new MultimediaError('Processing result is empty', 'PROCESSING_ERROR');
    }

    if (result.metadata && result.metadata.processingFailed) {
      throw new MultimediaError(
        'Processing marked as failed in metadata', 
        'PROCESSING_ERROR',
        { metadata: result.metadata }
      );
    }
  }

  /**
   * Enhance result metadata with additional information
   */
  protected async enhanceResultMetadata(
    result: ProcessingResult,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const enhanced = { ...result };

    enhanced.metadata = {
      ...enhanced.metadata,
      serviceName: this.constructor.name,
      processingOptions: options,
      timestamp: new Date().toISOString(),
      capabilities: this.getCapabilities()
    };

    return enhanced;
  }

  /**
   * Calculate result size for logging
   */
  protected getResultSize(result: ProcessingResult): number {
    if (result.output instanceof Buffer) {
      return result.output.length;
    }
    if (typeof result.output === 'string') {
      return Buffer.byteLength(result.output, 'utf8');
    }
    if (result.output instanceof File) {
      return result.output.size;
    }
    return 0;
  }

  /**
   * Health check for service availability
   */
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, any> }> {
    try {
      const capabilities = this.getCapabilities();
      const supportedTypes = this.getSupportedTypes();

      return {
        status: 'healthy',
        details: {
          serviceName: this.constructor.name,
          capabilities,
          supportedTypes,
          configVersion: this.config.version,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get performance metrics for this service
   */
  public getPerformanceMetrics(): Record<string, any> {
    return this.performanceTracker.getMetrics();
  }

  /**
   * Cleanup resources (override in subclasses if needed)
   */
  public async cleanup(): Promise<void> {
    this.logger.info('Cleaning up service resources');
    // Base cleanup logic - can be extended by subclasses
  }
}