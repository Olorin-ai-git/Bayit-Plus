// @ts-ignore - Export conflicts/**
 * Job Processor
 * 
 * Processes multimedia jobs with support for various job types,
 * progress tracking, and error handling.
 */

import { JobType, ProcessingOptions, ProcessingResult } from '../../types';
import { Logger } from '../utils/Logger';
import { ServiceFactory } from '../base/ServiceFactory';

export class JobProcessor {
  private readonly logger: Logger;
  private readonly config: any;
  private readonly serviceFactory: ServiceFactory;

  constructor(config: any = {}) {
    this.config = config;
    this.logger = new Logger('JobProcessor');
    this.serviceFactory = ServiceFactory.getInstance();
  }

  /**
   * Process job synchronously
   */
  public async processSync(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const jobType = this.determineJobType(options);
    const service = await this.getServiceForJobType(jobType);
    
    return service.processMedia(input, options);
  }

  /**
   * Process job with progress callback
   */
  public async process(
    input: File | Buffer | string,
    options: ProcessingOptions,
    onProgress?: (progress: number) => void
  ): Promise<ProcessingResult> {
    const jobType = this.determineJobType(options);
    
    try {
      this.logger.info('Starting job processing', { jobType });
      
      if (onProgress) onProgress(10);
      
      const service = await this.getServiceForJobType(jobType);
      
      if (onProgress) onProgress(30);
      
      const result = await service.processMedia(input, options);
      
      if (onProgress) onProgress(100);
      
      this.logger.info('Job processing completed', { jobType });
      
      return result;
      
    } catch (error) {
      this.logger.error('Job processing failed', { jobType, error });
      throw error;
    }
  }

  /**
   * Check if job type is supported
   */
  public supportsJobType(jobType: JobType): boolean {
    const supportedTypes: JobType[] = ['process', 'transcode', 'optimize', 'enhance'];
    return supportedTypes.includes(jobType);
  }

  /**
   * Get supported job types
   */
  public getSupportedJobTypes(): JobType[] {
    return ['process', 'transcode', 'optimize', 'enhance'];
  }

  /**
   * Validate job options
   */
  public validateJobOptions(options: ProcessingOptions): boolean {
    try {
      // Basic validation
      if (!options) return false;
      
      // Type-specific validation would go here
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Determine job type from options
   */
  private determineJobType(options: ProcessingOptions): JobType {
    if ((options as any).transcode) return 'transcode';
    if ((options as any).optimize) return 'optimize';
    if ((options as any).enhance) return 'enhance';
    return 'process';
  }

  /**
   * Get service for specific job type
   */
  private async getServiceForJobType(jobType: JobType): Promise<any> {
    // This is simplified - would need to determine media type as well
    return this.serviceFactory.getImageService();
  }
}