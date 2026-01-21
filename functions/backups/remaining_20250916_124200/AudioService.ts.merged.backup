// @ts-ignore - Export conflicts/**
 * Audio Processing Service
 * 
 * Comprehensive audio processing service supporting format conversion,
 * optimization, noise reduction, and advanced audio manipulation.
 */

import { 
  ProcessingOptions,
  ProcessingResult,
  MediaType,
  ServiceConfig,
  AudioProcessingOptions,
  AudioTranscodingOptions,
  AudioAnalysisResult,
  AudioEnhancementOptions 
} from '../../types';

import { MediaService } from '../base/MediaService';
import { AudioProcessor } from './AudioProcessor';
import { AudioTranscoder } from './AudioTranscoder';
import { AudioAnalyzer } from './AudioAnalyzer';
import { WaveformGenerator } from './WaveformGenerator';

/**
 * Main audio processing service implementation
 * Provides high-level interface for all audio operations
 */
export class AudioService extends MediaService {
  private readonly processor: AudioProcessor;
  private readonly transcoder: AudioTranscoder;
  private readonly analyzer: AudioAnalyzer;
  private readonly waveformGenerator: WaveformGenerator;

  private static readonly SUPPORTED_FORMATS = [
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/flac',
    'audio/m4a',
    'audio/wma',
    'audio/webm'
  ];

  private static readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  private static readonly MAX_DURATION = 7200; // 2 hours
  private static readonly SAMPLE_RATES = [8000, 16000, 22050, 44100, 48000, 96000];

  constructor(config: ServiceConfig) {
    super(config);
    
    this.processor = new AudioProcessor();
    this.transcoder = new AudioTranscoder();
    this.analyzer = new AudioAnalyzer();
    this.waveformGenerator = new WaveformGenerator();
  }

  /**
   * Main audio processing entry point
   */
  public async processMedia(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = performance.now();
    
    try {
      // Preprocess input and options
      const { input: processedInput, processedOptions } = await this.preprocess(input, options);
      const audioOptions = processedOptions as AudioProcessingOptions;

      // Load and analyze audio
      const audioBuffer = await this.loadAudioBuffer(processedInput);
      const analysis = await this.analyzer.analyze(audioBuffer);

      // Validate audio constraints
      await this.validateAudioConstraints(analysis);

      let result = audioBuffer;

      // Apply transcoding if specified
      if (audioOptions.transcode) {
        result = await this.transcoder.transcode(result, audioOptions.transcode);
      }

      // Apply audio processing operations
      if (audioOptions.operations && audioOptions.operations.length > 0) {
        result = await this.processor.process(result, audioOptions.operations);
      }

      // Apply enhancements if specified
      if (audioOptions.enhance) {
        result = await this.processor.enhance(result, audioOptions.enhance);
      }

      // Generate waveform if requested
      let waveform: Buffer | undefined;
      if (audioOptions.generateWaveform) {
        waveform = await this.waveformGenerator.generate(
          result, 
          audioOptions.waveformOptions || {}
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
          waveform: waveform,
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
   * Validate audio input
   */
  public async validateInput(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<boolean> {
    try {
      // Check file size
      const size = this.getInputSize(input);
      if (size > AudioService.MAX_FILE_SIZE) {
        throw new Error(`File size ${size} exceeds maximum ${AudioService.MAX_FILE_SIZE}`);
      }

      // Load audio buffer for validation
      const buffer = await this.loadAudioBuffer(input);

      // Check format
      const format = await this.detectFormat(buffer);
      if (!AudioService.SUPPORTED_FORMATS.includes(format)) {
        throw new Error(`Unsupported audio format: ${format}`);
      }

      // Analyze audio properties
      const analysis = await this.analyzer.analyze(buffer);
      
      // Check duration
      if (analysis.duration > AudioService.MAX_DURATION) {
        throw new Error(`Audio duration ${analysis.duration}s exceeds maximum ${AudioService.MAX_DURATION}s`);
      }

      return true;

    } catch (error) {
      this.logger.warn('Audio validation failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get supported media types
   */
  public getSupportedTypes(): MediaType[] {
    return ['audio'];
  }

  /**
   * Get service capabilities
   */
  public getCapabilities(): Record<string, any> {
    return {
      formats: AudioService.SUPPORTED_FORMATS,
      maxFileSize: AudioService.MAX_FILE_SIZE,
      maxDuration: AudioService.MAX_DURATION,
      sampleRates: AudioService.SAMPLE_RATES,
      features: {
        transcoding: true,
        waveformGeneration: true,
        noiseReduction: true,
        audioEnhancement: true,
        podcastOptimization: true,
        voiceProcessing: this.config.features?.voiceProcessing || false,
        aiEnhancement: this.config.features?.aiEnhancement || false
      },
      processing: this.processor.getCapabilities(),
      transcoding: this.transcoder.getCapabilities()
    };
  }

  /**
   * Transcode audio to different format/quality
   */
  public async transcodeAudio(
    input: File | Buffer | string,
    options: AudioTranscodingOptions
  ): Promise<ProcessingResult> {
    const buffer = await this.loadAudioBuffer(input);
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
   * Generate audio waveform visualization
   */
  public async generateWaveform(
    input: File | Buffer | string,
    options: any = {}
  ): Promise<ProcessingResult> {
    const buffer = await this.loadAudioBuffer(input);
    const waveform = await this.waveformGenerator.generate(buffer, options);

    return {
      output: waveform,
      metadata: {
        waveformOptions: options,
        format: options.format || 'png'
      }
    };
  }

  /**
   * Enhance audio quality (noise reduction, normalization, etc.)
   */
  public async enhanceAudio(
    input: File | Buffer | string,
    options: AudioEnhancementOptions
  ): Promise<ProcessingResult> {
    const buffer = await this.loadAudioBuffer(input);
    const enhanced = await this.processor.enhance(buffer, options);

    return {
      output: enhanced,
      metadata: {
        enhancementOptions: options,
        originalSize: buffer.length,
        enhancedSize: enhanced.length
      }
    };
  }

  /**
   * Optimize audio for podcast/voice content
   */
  public async optimizeForPodcast(
    input: File | Buffer | string
  ): Promise<ProcessingResult> {
    const podcastOptions: AudioEnhancementOptions = {
      noiseReduction: { enabled: true, level: 0.7 },
      normalization: { enabled: true, target: -16 },
      compressor: { 
        enabled: true, 
        threshold: -20, 
        ratio: 4, 
        attack: 5, 
        release: 100 
      },
      equalizer: {
        enabled: true,
        presets: 'voice'
      }
    };

    const buffer = await this.loadAudioBuffer(input);
    const optimized = await this.processor.enhance(buffer, podcastOptions);

    // Also transcode to optimal podcast format
    const transcodingOptions: AudioTranscodingOptions = {
      format: 'mp3',
      bitrate: 128,
      sampleRate: 44100,
      channels: 'mono'
    };

    const final = await this.transcoder.transcode(optimized, transcodingOptions);

    return {
      output: final,
      metadata: {
        optimization: 'podcast',
        originalSize: buffer.length,
        optimizedSize: final.length,
        compressionRatio: (1 - final.length / buffer.length) * 100
      }
    };
  }

  /**
   * Split audio into segments
   */
  public async splitAudio(
    input: File | Buffer | string,
    segments: Array<{ start: number; end: number; name?: string }>
  ): Promise<ProcessingResult[]> {
    const buffer = await this.loadAudioBuffer(input);
    const results: ProcessingResult[] = [];

    for (const segment of segments) {
      try {
        const segmentBuffer = await this.processor.extractSegment(
          buffer, 
          segment.start, 
          segment.end
        );

        results.push({
          output: segmentBuffer,
          metadata: {
            segmentName: segment.name || `segment_${segment.start}-${segment.end}`,
            startTime: segment.start,
            endTime: segment.end,
            duration: segment.end - segment.start
          }
        });

      } catch (error) {
        this.logger.warn(`Failed to extract segment ${segment.start}-${segment.end}`, { error });
      }
    }

    return results;
  }

  /**
   * Merge multiple audio files
   */
  public async mergeAudio(
    inputs: Array<File | Buffer | string>,
    options: { fadeIn?: number; fadeOut?: number; crossfade?: number } = {}
  ): Promise<ProcessingResult> {
    const buffers = await Promise.all(
      inputs.map(input => this.loadAudioBuffer(input))
    );

    const merged = await this.processor.merge(buffers, options);

    return {
      output: merged,
      metadata: {
        inputCount: buffers.length,
        mergedSize: merged.length,
        mergeOptions: options
      }
    };
  }

  /**
   * Analyze audio content and metadata
   */
  public async analyzeAudio(
    input: File | Buffer | string
  ): Promise<AudioAnalysisResult> {
    const buffer = await this.loadAudioBuffer(input);
    return this.analyzer.analyze(buffer);
  }

  /**
   * Batch process multiple audio files
   */
  public async batchProcess(
    inputs: Array<File | Buffer | string>,
    options: AudioProcessingOptions,
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
        this.logger.warn(`Failed to process audio ${i + 1}/${total}`, { error });
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
    const audioOptions = options as AudioProcessingOptions;

    // Set default transcoding format if not specified
    if (audioOptions.transcode && !audioOptions.transcode.format) {
      audioOptions.transcode.format = 'mp3'; // Default to MP3 for compatibility
    }

    // Set default waveform options
    if (audioOptions.generateWaveform && !audioOptions.waveformOptions) {
      audioOptions.waveformOptions = {
        width: 800,
        height: 200,
        color: '#3B82F6',
        format: 'png'
      };
    }

    return audioOptions;
  }

  /**
   * Validate audio constraints
   */
  private async validateAudioConstraints(analysis: AudioAnalysisResult): Promise<void> {
    if (analysis.duration > AudioService.MAX_DURATION) {
      throw new Error(`Audio duration ${analysis.duration}s exceeds maximum allowed`);
    }

    if (analysis.sampleRate && !AudioService.SAMPLE_RATES.includes(analysis.sampleRate)) {
      this.logger.warn(`Unusual sample rate: ${analysis.sampleRate}Hz`);
    }

    if (analysis.bitrate && analysis.bitrate > 320) {
      this.logger.warn(`High bitrate detected: ${analysis.bitrate}kbps`);
    }
  }

  /**
   * Load audio buffer from various input types
   */
  private async loadAudioBuffer(input: File | Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
      return input;
    }

    if (input instanceof File) {
      return Buffer.from(await input.arrayBuffer());
    }

    if (typeof input === 'string') {
      // Could be a file path or URL - would need additional handling
      throw new Error('String input not supported for audio processing');
    }

    throw new Error('Invalid input type for audio processing');
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
   * Detect audio format from buffer
   */
  private async detectFormat(buffer: Buffer): Promise<string> {
    // Simple format detection based on magic numbers
    const signature = buffer.slice(0, 12);

    // MP3 signature
    if ((signature[0] === 0xFF && (signature[1] & 0xE0) === 0xE0) || 
        signature.slice(0, 3).toString() === 'ID3') {
      return 'audio/mp3';
    }

    // WAV signature
    if (signature.slice(0, 4).toString() === 'RIFF' && 
        signature.slice(8, 12).toString() === 'WAVE') {
      return 'audio/wav';
    }

    // OGG signature
    if (signature.slice(0, 4).toString() === 'OggS') {
      return 'audio/ogg';
    }

    // FLAC signature
    if (signature.slice(0, 4).toString() === 'fLaC') {
      return 'audio/flac';
    }

    return 'audio/unknown';
  }
}