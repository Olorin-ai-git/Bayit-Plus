// @ts-ignore - Export conflicts/**
 * Video Processing Service
 * 
 * Comprehensive video processing service supporting transcoding, optimization,
 * frame extraction, thumbnail generation, and advanced video manipulation.
 */

import { 
  ProcessingOptions,
  ProcessingResult,
  MediaType,
  ServiceConfig,
  VideoProcessingOptions,
  VideoTranscodingOptions,
  VideoAnalysisResult,
  VideoThumbnailOptions 
} from '../../types';

import { MediaService } from '../base/MediaService';
import { VideoProcessor } from './VideoProcessor';
import { VideoTranscoder } from './VideoTranscoder';
import { VideoAnalyzer } from './VideoAnalyzer';
import { ThumbnailGenerator } from './ThumbnailGenerator';

/**
 * Main video processing service implementation
 * Provides high-level interface for all video operations
 */
export class VideoService extends MediaService {
  private readonly processor: VideoProcessor;
  private readonly transcoder: VideoTranscoder;
  private readonly analyzer: VideoAnalyzer;
  private readonly thumbnailGenerator: ThumbnailGenerator;

  private static readonly SUPPORTED_FORMATS = [
    'video/mp4',
    'video/webm',
    'video/avi',
    'video/mov',
    'video/mkv',
    'video/flv',
    'video/wmv',
    'video/3gp'
  ];

  private static readonly MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
  private static readonly MAX_DURATION = 3600; // 1 hour
  private static readonly MAX_RESOLUTION = { width: 3840, height: 2160 }; // 4K

  constructor(config: ServiceConfig) {
    super(config);
    
    this.processor = new VideoProcessor(config.processing || {});
    this.transcoder = new VideoTranscoder(config.transcoding || {});
    this.analyzer = new VideoAnalyzer(config.analysis || {});
    this.thumbnailGenerator = new ThumbnailGenerator(config.thumbnails || {});
  }

  /**
   * Main video processing entry point
   */
  public async processMedia(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = performance.now();
    
    try {
      // Preprocess input and options
      const { input: processedInput, processedOptions } = await this.preprocess(input, options);
      const videoOptions = processedOptions as VideoProcessingOptions;

      // Load and analyze video
      const videoBuffer = await this.loadVideoBuffer(processedInput);
      const analysis = await this.analyzer.analyzeVideo(videoBuffer);

      // Validate video constraints
      await this.validateVideoConstraints(analysis);

      let result = videoBuffer;

      // Apply transcoding if specified
      if (videoOptions.transcode) {
        result = await this.transcoder.transcode(result, videoOptions.transcode);
      }

      // Apply video processing operations
      if (videoOptions.operations && videoOptions.operations.length > 0) {
        result = await this.processor.process(result, videoOptions.operations);
      }

      // Generate thumbnails if requested
      let thumbnails: Buffer[] = [];
      if (videoOptions.generateThumbnails) {
        thumbnails = await this.thumbnailGenerator.generateThumbnails(
          result, 
          videoOptions.thumbnailOptions || {}
        );
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
          thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
          format: await this.detectFormat(result)
        }
      };

      return this.postprocess(processingResult, processedOptions);

    } catch (error) {
      this.performanceTracker.recordError('processMedia', error as Error);
      throw this.errorHandler.handleError(error as Error, 'processMedia');
    }
  }

  /**
   * Validate video input
   */
  public async validateInput(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<boolean> {
    try {
      // Check file size
      const size = this.getInputSize(input);
      if (size > VideoService.MAX_FILE_SIZE) {
        throw new Error(`File size ${size} exceeds maximum ${VideoService.MAX_FILE_SIZE}`);
      }

      // Load video buffer for validation
      const buffer = await this.loadVideoBuffer(input);

      // Check format
      const format = await this.detectFormat(buffer);
      if (!VideoService.SUPPORTED_FORMATS.includes(format)) {
        throw new Error(`Unsupported video format: ${format}`);
      }

      // Analyze video properties
      const analysis = await this.analyzer.analyzeVideo(buffer);
      
      // Check duration
      if (analysis.duration > VideoService.MAX_DURATION) {
        throw new Error(`Video duration ${analysis.duration}s exceeds maximum ${VideoService.MAX_DURATION}s`);
      }

      // Check resolution
      if (analysis.width > VideoService.MAX_RESOLUTION.width ||
          analysis.height > VideoService.MAX_RESOLUTION.height) {
        throw new Error(`Resolution ${analysis.width}x${analysis.height} exceeds maximum`);
      }

      return true;

    } catch (error) {
      this.logger.warn('Video validation failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get supported media types
   */
  public getSupportedTypes(): MediaType[] {
    return ['video'];
  }

  /**
   * Get service capabilities
   */
  public getCapabilities(): Record<string, any> {
    return {
      formats: VideoService.SUPPORTED_FORMATS,
      maxFileSize: VideoService.MAX_FILE_SIZE,
      maxDuration: VideoService.MAX_DURATION,
      maxResolution: VideoService.MAX_RESOLUTION,
      features: {
        transcoding: true,
        thumbnailGeneration: true,
        frameExtraction: true,
        videoAnalysis: true,
        streamingPrep: true,
        watermarking: this.config.features?.watermarking || false,
        aiEnhancement: this.config.features?.aiEnhancement || false
      },
      processing: this.processor.getCapabilities(),
      transcoding: this.transcoder.getCapabilities()
    };
  }

  /**
   * Transcode video to different format/quality
   */
  public async transcodeVideo(
    input: File | Buffer | string,
    options: VideoTranscodingOptions
  ): Promise<ProcessingResult> {
    const buffer = await this.loadVideoBuffer(input);
    const transcoded = await this.transcoder.transcode(buffer, options);

    return {
      output: transcoded,
      metadata: {
        originalFormat: await this.detectFormat(buffer),
        targetFormat: options.format,
        originalSize: buffer.length,
        transcodedSize: transcoded.length,
        compressionRatio: (1 - transcoded.length / buffer.length) * 100,
        transcodingOptions: options
      }
    };
  }

  /**
   * Generate video thumbnails
   */
  public async generateThumbnails(
    input: File | Buffer | string,
    options: VideoThumbnailOptions = {}
  ): Promise<ProcessingResult> {
    const buffer = await this.loadVideoBuffer(input);
    const thumbnails = await this.thumbnailGenerator.generateThumbnails(buffer, options);

    return {
      output: thumbnails,
      metadata: {
        thumbnailCount: thumbnails.length,
        thumbnailOptions: options,
        format: 'image/jpeg' // Default thumbnail format
      }
    };
  }

  /**
   * Extract frames at specific timestamps
   */
  public async extractFrames(
    input: File | Buffer | string,
    timestamps: number[]
  ): Promise<ProcessingResult[]> {
    const buffer = await this.loadVideoBuffer(input);
    const frames: ProcessingResult[] = [];

    for (const timestamp of timestamps) {
      try {
        const frame = await this.thumbnailGenerator.extractFrameAtTime(buffer, timestamp);
        frames.push({
          output: frame,
          metadata: {
            timestamp,
            format: 'image/jpeg'
          }
        });
      } catch (error) {
        this.logger.warn(`Failed to extract frame at ${timestamp}s`, { error });
      }
    }

    return frames;
  }

  /**
   * Analyze video content and metadata
   */
  public async analyzeVideo(
    input: File | Buffer | string
  ): Promise<VideoAnalysisResult> {
    const buffer = await this.loadVideoBuffer(input);
    return this.analyzer.analyzeVideo(buffer);
  }

  /**
   * Prepare video for streaming (generate multiple bitrates)
   */
  public async prepareForStreaming(
    input: File | Buffer | string,
    qualities: Array<{ width: number; height: number; bitrate: number; name: string }>
  ): Promise<ProcessingResult[]> {
    const buffer = await this.loadVideoBuffer(input);
    const streamingVersions: ProcessingResult[] = [];

    for (const quality of qualities) {
      try {
        const transcodingOptions: VideoTranscodingOptions = {
          format: 'mp4',
          videoCodec: 'h264',
          audioCodec: 'aac',
          videoBitrate: quality.bitrate,
          resolution: {
            width: quality.width,
            height: quality.height
          }
        };

        const transcoded = await this.transcoder.transcode(buffer, transcodingOptions);

        streamingVersions.push({
          output: transcoded,
          metadata: {
            quality: quality.name,
            resolution: `${quality.width}x${quality.height}`,
            bitrate: quality.bitrate,
            format: 'mp4',
            fileSize: transcoded.length
          }
        });

      } catch (error) {
        this.logger.warn(`Failed to create streaming version: ${quality.name}`, { error });
      }
    }

    return streamingVersions;
  }

  /**
   * Batch process multiple videos
   */
  public async batchProcess(
    inputs: Array<File | Buffer | string>,
    options: VideoProcessingOptions,
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
        this.logger.warn(`Failed to process video ${i + 1}/${total}`, { error });
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
    const videoOptions = options as VideoProcessingOptions;

    // Set default transcoding format if not specified
    if (videoOptions.transcode && !videoOptions.transcode.format) {
      videoOptions.transcode.format = 'mp4'; // Default to MP4 for compatibility
    }

    // Set default thumbnail options
    if (videoOptions.generateThumbnails && !videoOptions.thumbnailOptions) {
      videoOptions.thumbnailOptions = {
        count: 3,
        width: 320,
        height: 240,
        format: 'jpeg',
        quality: 85
      };
    }

    return videoOptions;
  }

  /**
   * Validate video constraints
   */
  private async validateVideoConstraints(analysis: VideoAnalysisResult): Promise<void> {
    if (analysis.duration > VideoService.MAX_DURATION) {
      throw new Error(`Video duration ${analysis.duration}s exceeds maximum allowed`);
    }

    if (analysis.width > VideoService.MAX_RESOLUTION.width ||
        analysis.height > VideoService.MAX_RESOLUTION.height) {
      throw new Error(`Video resolution ${analysis.width}x${analysis.height} exceeds maximum allowed`);
    }

    if (analysis.fps && analysis.fps > 120) {
      throw new Error(`Frame rate ${analysis.fps} is too high`);
    }
  }

  /**
   * Load video buffer from various input types
   */
  private async loadVideoBuffer(input: File | Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
      return input;
    }

    if (input instanceof File) {
      return Buffer.from(await input.arrayBuffer());
    }

    if (typeof input === 'string') {
      // Could be a file path or URL - would need additional handling
      throw new Error('String input not supported for video processing');
    }

    throw new Error('Invalid input type for video processing');
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
   * Detect video format from buffer
   */
  private async detectFormat(buffer: Buffer): Promise<string> {
    // Simple format detection based on magic numbers
    const signature = buffer.slice(0, 12);

    // MP4 signature
    if (signature.slice(4, 8).toString() === 'ftyp') {
      return 'video/mp4';
    }

    // WebM signature
    if (signature[0] === 0x1A && signature[1] === 0x45 && signature[2] === 0xDF && signature[3] === 0xA3) {
      return 'video/webm';
    }

    // AVI signature
    if (signature.slice(0, 4).toString() === 'RIFF' && signature.slice(8, 12).toString() === 'AVI ') {
      return 'video/avi';
    }

    return 'video/unknown';
  }
}