// @ts-ignore - Export conflicts/**
 * Image Processing Service
 * 
 * Comprehensive image processing service supporting format conversion,
 * optimization, manipulation, and advanced features like AI enhancement.
 */

import { 
  ProcessingOptions,
  ProcessingResult,
  MediaType,
  ServiceConfig,
  ImageProcessingOptions,
  ImageOptimizationOptions,
  ImageTransformOptions,
  ImageAnalysisResult 
} from '../../types';

import { MediaService } from '../base/MediaService';
import { ImageProcessor } from './ImageProcessor';
import { ImageOptimizer } from './ImageOptimizer';
import { ImageAnalyzer } from './ImageAnalyzer';
import { ImageTransformer } from './ImageTransformer';

/**
 * Main image processing service implementation
 * Provides high-level interface for all image operations
 */
export class ImageService extends MediaService {
  private readonly processor: ImageProcessor;
  private readonly optimizer: ImageOptimizer;
  private readonly analyzer: ImageAnalyzer;
  private readonly transformer: ImageTransformer;

  private static readonly SUPPORTED_FORMATS = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/svg+xml'
  ];

  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly MIN_DIMENSIONS = { width: 1, height: 1 };
  private static readonly MAX_DIMENSIONS = { width: 8192, height: 8192 };

  constructor(config: ServiceConfig) {
    super(config);
    
    this.processor = new ImageProcessor(config.processing || {});
    this.optimizer = new ImageOptimizer(config.optimization || {});
    this.analyzer = new ImageAnalyzer(config.analysis || {});
    this.transformer = new ImageTransformer(config.transformation || {});
  }

  /**
   * Main image processing entry point
   */
  public async processMedia(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = performance.now();
    
    try {
      // Preprocess input and options
      const { input: processedInput, processedOptions } = await this.preprocess(input, options);
      const imageOptions = processedOptions as ImageProcessingOptions;

      // Load and analyze image
      const imageBuffer = await this.loadImageBuffer(processedInput);
      const analysis = await this.analyzer.analyzeImage(imageBuffer);

      let result = imageBuffer;

      // Apply transformations if specified
      if (imageOptions.transform) {
        result = await this.transformer.transform(result, imageOptions.transform);
      }

      // Apply optimization
      if (imageOptions.optimize !== false) {
        const optimizationOptions = {
          ...imageOptions.optimization,
          targetFormat: imageOptions.format,
          quality: imageOptions.quality || 85
        };
        result = await this.optimizer.optimize(result, optimizationOptions);
      }

      // Apply additional processing
      if (imageOptions.processing) {
        result = await this.processor.process(result, imageOptions.processing);
      }

      // Create processing result
      const processingResult: ProcessingResult = {
        output: result,
        metadata: {
          ...analysis,
          originalSize: this.getInputSize(input),
          processedSize: result.length,
          compressionRatio: (1 - result.length / this.getInputSize(input)) * 100,
          processingTime: performance.now() - startTime,
          format: await this.detectFormat(result),
          dimensions: await this.getDimensions(result)
        }
      };

      return this.postprocess(processingResult, processedOptions);

    } catch (error) {
      this.performanceTracker.recordError('processMedia', error as Error);
      throw this.errorHandler.handleError(error as Error, 'processMedia');
    }
  }

  /**
   * Validate image input
   */
  public async validateInput(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<boolean> {
    try {
      // Check file size
      const size = this.getInputSize(input);
      if (size > ImageService.MAX_FILE_SIZE) {
        throw new Error(`File size ${size} exceeds maximum ${ImageService.MAX_FILE_SIZE}`);
      }

      // Load image buffer for validation
      const buffer = await this.loadImageBuffer(input);

      // Check format
      const format = await this.detectFormat(buffer);
      if (!ImageService.SUPPORTED_FORMATS.includes(format)) {
        throw new Error(`Unsupported image format: ${format}`);
      }

      // Check dimensions
      const dimensions = await this.getDimensions(buffer);
      if (dimensions.width < ImageService.MIN_DIMENSIONS.width ||
          dimensions.height < ImageService.MIN_DIMENSIONS.height ||
          dimensions.width > ImageService.MAX_DIMENSIONS.width ||
          dimensions.height > ImageService.MAX_DIMENSIONS.height) {
        throw new Error(`Invalid dimensions: ${dimensions.width}x${dimensions.height}`);
      }

      return true;

    } catch (error) {
      this.logger.warn('Image validation failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get supported media types
   */
  public getSupportedTypes(): MediaType[] {
    return ['image'];
  }

  /**
   * Get service capabilities
   */
  public getCapabilities(): Record<string, any> {
    return {
      formats: ImageService.SUPPORTED_FORMATS,
      maxFileSize: ImageService.MAX_FILE_SIZE,
      maxDimensions: ImageService.MAX_DIMENSIONS,
      features: {
        optimization: true,
        transformation: true,
        analysis: true,
        formatConversion: true,
        batchProcessing: true,
        aiEnhancement: this.config.features?.aiEnhancement || false
      },
      processing: this.processor.getCapabilities(),
      optimization: this.optimizer.getCapabilities(),
      transformation: this.transformer.getCapabilities()
    };
  }

  /**
   * Optimize image with specific options
   */
  public async optimizeImage(
    input: File | Buffer | string,
    options: ImageOptimizationOptions = {}
  ): Promise<ProcessingResult> {
    const buffer = await this.loadImageBuffer(input);
    const optimized = await this.optimizer.optimize(buffer, options);

    return {
      output: optimized,
      metadata: {
        originalSize: buffer.length,
        optimizedSize: optimized.length,
        compressionRatio: (1 - optimized.length / buffer.length) * 100,
        format: options.format || await this.detectFormat(optimized)
      }
    };
  }

  /**
   * Transform image with specific options
   */
  public async transformImage(
    input: File | Buffer | string,
    options: ImageTransformOptions
  ): Promise<ProcessingResult> {
    const buffer = await this.loadImageBuffer(input);
    const transformed = await this.transformer.transform(buffer, options);

    return {
      output: transformed,
      metadata: {
        originalDimensions: await this.getDimensions(buffer),
        newDimensions: await this.getDimensions(transformed),
        transformations: options
      }
    };
  }

  /**
   * Analyze image content and metadata
   */
  public async analyzeImage(
    input: File | Buffer | string
  ): Promise<ImageAnalysisResult> {
    const buffer = await this.loadImageBuffer(input);
    return this.analyzer.analyzeImage(buffer);
  }

  /**
   * Generate multiple sizes/formats for responsive design
   */
  public async generateResponsiveVersions(
    input: File | Buffer | string,
    sizes: Array<{ width: number; height?: number; format?: string; quality?: number }>
  ): Promise<ProcessingResult[]> {
    const buffer = await this.loadImageBuffer(input);
    const results: ProcessingResult[] = [];

    for (const size of sizes) {
      try {
        const transformOptions: ImageTransformOptions = {
          resize: {
            width: size.width,
            height: size.height,
            fit: 'cover'
          }
        };

        const optimizationOptions: ImageOptimizationOptions = {
          format: size.format as any,
          quality: size.quality || 85
        };

        let result = await this.transformer.transform(buffer, transformOptions);
        result = await this.optimizer.optimize(result, optimizationOptions);

        results.push({
          output: result,
          metadata: {
            size: size,
            dimensions: await this.getDimensions(result),
            format: await this.detectFormat(result),
            fileSize: result.length
          }
        });

      } catch (error) {
        this.logger.warn(`Failed to generate responsive version for size ${size.width}x${size.height}`, { error });
      }
    }

    return results;
  }

  /**
   * Batch process multiple images
   */
  public async batchProcess(
    inputs: Array<File | Buffer | string>,
    options: ImageProcessingOptions,
    onProgress?: (completed: number, total: number) => void
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    const total = inputs.length;

    for (let i = 0; i < inputs.length; i++) {
      try {
        const result = await this.processMedia(inputs[i], options);
        results.push(result);
        
        if (onProgress) {
          onProgress(i + 1, total);
        }

      } catch (error) {
        this.logger.warn(`Failed to process image ${i + 1}/${total}`, { error });
        results.push({
          output: Buffer.alloc(0),
          metadata: { error: (error as Error).message }
        });
      }
    }

    return results;
  }

  /**
   * Service-specific option preprocessing
   */
  protected async serviceSpecificOptionPreprocessing(
    options: ProcessingOptions
  ): Promise<ProcessingOptions> {
    const imageOptions = options as ImageProcessingOptions;

    // Set default format if not specified
    if (!imageOptions.format) {
      imageOptions.format = 'webp'; // Default to WebP for best compression
    }

    // Validate quality settings
    if (imageOptions.quality !== undefined) {
      imageOptions.quality = Math.max(1, Math.min(100, imageOptions.quality));
    }

    // Set default optimization if not specified
    if (imageOptions.optimize === undefined) {
      imageOptions.optimize = true;
    }

    return imageOptions;
  }

  /**
   * Load image buffer from various input types
   */
  private async loadImageBuffer(input: File | Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
      return input;
    }

    if (input instanceof File) {
      return Buffer.from(await input.arrayBuffer());
    }

    if (typeof input === 'string') {
      // Assume it's a base64 string or URL
      if (input.startsWith('data:')) {
        const base64Data = input.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      }
      // Could be a file path or URL - would need additional handling
      throw new Error('String input must be base64 data URL');
    }

    throw new Error('Invalid input type for image processing');
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

    if (typeof input === 'string' && input.startsWith('data:')) {
      // Estimate base64 size
      return Math.floor(input.length * 0.75);
    }

    return 0;
  }

  /**
   * Detect image format from buffer
   */
  private async detectFormat(buffer: Buffer): Promise<string> {
    // Simple format detection based on magic numbers
    const signature = buffer.slice(0, 12);

    if (signature[0] === 0xFF && signature[1] === 0xD8) {
      return 'image/jpeg';
    }
    
    if (signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4E && signature[3] === 0x47) {
      return 'image/png';
    }

    if (signature.slice(0, 6).toString() === 'RIFF' && signature.slice(8, 12).toString() === 'WEBP') {
      return 'image/webp';
    }

    if (signature.slice(0, 3).toString() === 'GIF') {
      return 'image/gif';
    }

    return 'image/unknown';
  }

  /**
   * Get image dimensions
   */
  private async getDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    // This would typically use a proper image library like sharp or jimp
    // For now, returning placeholder values
    return { width: 0, height: 0 };
  }
}