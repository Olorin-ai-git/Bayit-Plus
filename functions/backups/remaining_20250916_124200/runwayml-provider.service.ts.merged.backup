// @ts-ignore - Export conflicts/**
 * RunwayML Video Generation Provider
 * 
 * Secondary video generation provider using RunwayML Gen-2 API with polling-based status checking,
 * creative video generation capabilities, and artistic control for innovative content.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import axios, { AxiosInstance } from 'axios';
import * as admin from 'firebase-admin';
import {
  BaseVideoProvider,
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoGenerationStatus,
  ProviderCapabilities,
  RateLimitConfig,
  ProviderHealthStatus,
  ProviderPerformanceMetrics,
  VideoRequirements,
  VideoProviderError,
  VideoProviderErrorType,
  ProviderConfig
} from './base-provider.interface';

interface RunwayMLGenerationPayload {
  model: 'gen2' | 'gen1';
  prompt: string;
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  duration?: number; // 4-10 seconds
  motion?: 'low' | 'medium' | 'high';
  style?: 'cinematic' | 'artistic' | 'professional' | 'dynamic';
  seed?: number;
  enhance_prompt?: boolean;
  motion_vectors?: Array<{
    x: number;
    y: number;
    direction: number;
    intensity: number;
  }>;
  camera_motion?: {
    type: 'pan' | 'zoom' | 'tilt' | 'static';
    intensity: number;
  };
}

interface RunwayMLAPIResponse {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  createdAt: string;
  updatedAt: string;
  output?: string; // Video URL when completed
  thumbnailUrl?: string;
  progress?: number; // 0-100
  metadata?: {
    duration: number;
    width: number;
    height: number;
    fps: number;
    format: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface RunwayMLStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  progress: number;
  output?: string;
  thumbnailUrl?: string;
  metadata?: {
    duration: number;
    width: number;
    height: number;
    fps: number;
    format: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  createdAt: string;
  updatedAt: string;
}

interface RunwayMLPromptEnhancement {
  originalPrompt: string;
  enhancedPrompt: string;
  styleModifiers: string[];
  motionSuggestions: string[];
  qualityScore: number;
}

/**
 * Polling Manager for RunwayML Status Tracking
 */
class RunwayMLPollingManager {
  private activePollers: Map<string, NodeJS.Timeout> = new Map();
  private provider: RunwayMLProvider;
  
  constructor(provider: RunwayMLProvider) {
    this.provider = provider;
  }
  
  startPolling(jobId: string, runwayId: string): void {
    if (this.activePollers.has(jobId)) {
      this.stopPolling(jobId);
    }
    
    let pollInterval = 2000; // Start with 2 seconds
    let pollCount = 0;
    const maxPolls = 180; // 6 minutes maximum (considering exponential backoff)
    
    const poll = async () => {
      try {
        pollCount++;
        
        const status = await this.provider.checkRunwayMLStatus(runwayId);
        
        // Update status in Firestore
        await this.updateJobStatus(jobId, status, runwayId);
        
        // Check if we should stop polling
        if (status.status === 'succeeded' || status.status === 'failed' || pollCount >= maxPolls) {
          this.stopPolling(jobId);
          return;
        }
        
        // Exponential backoff with jitter
        pollInterval = Math.min(pollInterval * 1.2, 15000); // Max 15 seconds
        const jitter = Math.random() * 1000; // 0-1 second jitter
        
        const timeout = setTimeout(poll, pollInterval + jitter);
        this.activePollers.set(jobId, timeout);
        
      } catch (error) {
        
        // Retry with longer interval on error
        pollInterval = Math.min(pollInterval * 1.5, 30000);
        const timeout = setTimeout(poll, pollInterval);
        this.activePollers.set(jobId, timeout);
      }
    };
    
    // Start first poll
    poll();
  }
  
  stopPolling(jobId: string): void {
    const timeout = this.activePollers.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.activePollers.delete(jobId);
    }
  }
  
  stopAllPolling(): void {
    this.activePollers.forEach((timeout, jobId) => {
      this.stopPolling(jobId);
    });
  }
  
  private async updateJobStatus(jobId: string, status: RunwayMLStatusResponse, runwayId: string): Promise<void> {
    try {
      const db = admin.firestore();
      
      const statusData = {
        jobId,
        runwayId,
        status: this.mapRunwayMLStatus(status.status),
        progress: status.progress || 0,
        videoUrl: status.output,
        thumbnailUrl: status.thumbnailUrl,
        duration: status.metadata?.duration,
        error: status.error ? {
          code: status.error.code,
          message: status.error.message,
          retryable: this.isRetryableError(status.error.code)
        } : undefined,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        metadata: status.metadata
      };
      
      await db.collection('runwayml_jobs').doc(jobId).update(statusData);
      
      // Also update the main job document if it exists
      try {
        const jobDoc = await db.collection('jobs').doc(jobId).get();
        if (jobDoc.exists) {
          await db.collection('jobs').doc(jobId).update({
            'videoGeneration.status': statusData.status,
            'videoGeneration.progress': statusData.progress,
            'videoGeneration.videoUrl': statusData.videoUrl,
            'videoGeneration.provider': 'runwayml',
            'videoGeneration.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (jobUpdateError) {
      }
      
    } catch (error) {
    }
  }
  
  private mapRunwayMLStatus(runwayStatus: string): 'queued' | 'processing' | 'completed' | 'failed' {
    switch (runwayStatus) {
      case 'pending': return 'queued';
      case 'processing': return 'processing';
      case 'succeeded': return 'completed';
      case 'failed': return 'failed';
      default: return 'queued';
    }
  }
  
  private isRetryableError(errorCode: string): boolean {
    const retryableErrors = [
      'RATE_LIMIT_EXCEEDED',
      'TEMPORARY_UNAVAILABLE',
      'PROCESSING_TIMEOUT',
      'NETWORK_ERROR',
      'SERVER_ERROR'
    ];
    return retryableErrors.includes(errorCode);
  }
}

export class RunwayMLProvider extends BaseVideoProvider {
  readonly name = 'runwayml';
  readonly priority = 2; // Second priority after HeyGen
  
  readonly capabilities: ProviderCapabilities = {
    maxDuration: 10, // 4-10 seconds for RunwayML Gen-2
    maxResolution: '1920x1080', // Full HD support
    supportedFormats: ['mp4', 'gif'],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    voiceCloning: false, // RunwayML focuses on video, not voice
    customAvatars: false, // Text-to-video generation
    realTimeGeneration: false, // Polling-based status updates
    backgroundCustomization: true, // Through prompt engineering
    subtitleSupport: false, // Video generation only
    multiLanguageSupport: true, // Through prompt text
    emotionControl: true, // Through style and prompt modifiers
    voiceSpeedControl: false // No voice generation
  };
  
  readonly rateLimits: RateLimitConfig = {
    requestsPerMinute: 25,
    requestsPerHour: 100,
    concurrentRequests: 5,
    dailyQuota: 500,
    costPerRequest: 0.75 // Estimated cost per request
  };
  
  private httpClient: AxiosInstance | null = null;
  private baseUrl = 'https://api.runwayml.com/v1';
  private pollingManager: RunwayMLPollingManager;
  
  // RunwayML style configurations mapped to CVPlus styles
  private readonly styleConfigs: Record<string, { style: string; motionLevel: string; enhancePrompt: boolean }> = {
    professional: {
      style: 'professional',
      motionLevel: 'low',
      enhancePrompt: true
    },
    friendly: {
      style: 'cinematic',
      motionLevel: 'medium',
      enhancePrompt: true
    },
    energetic: {
      style: 'dynamic',
      motionLevel: 'high',
      enhancePrompt: true
    }
  };
  
  // Creative prompt templates for different scenarios
  private readonly promptTemplates = {
    professional: 'Professional corporate video presentation showing {description}. Clean, polished aesthetic with subtle camera movements. High quality, professional lighting.',
    friendly: 'Warm and approachable video featuring {description}. Cinematic quality with smooth camera movements and inviting atmosphere.',
    energetic: 'Dynamic and engaging video showcasing {description}. Vibrant energy with creative camera movements and modern visual style.'
  };
  
  constructor() {
    super();
    this.pollingManager = new RunwayMLPollingManager(this);
  }
  
  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);
    
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: config.timeout || 60000 // 60 second timeout
    });
    
    // Validate API access
    await this.validateAPIAccess();
  }
  
  async generateVideo(
    script: string,
    options: VideoGenerationOptions = {}
  ): Promise<VideoGenerationResult> {
    this.ensureInitialized();
    
    try {
      const jobId = options.jobId || this.generateJobId();
      
      
      // Generate enhanced prompt for RunwayML
      const enhancedPrompt = await this.enhancePromptForVideo(script, options);
      const payload = this.buildGenerationPayload(enhancedPrompt, options);
      
      
      const response = await this.httpClient!.post<RunwayMLAPIResponse>(
        '/generate',
        payload
      );
      
      if (!response.data.id) {
        throw new VideoProviderError(
          VideoProviderErrorType.PROCESSING_ERROR,
          `RunwayML API error: Invalid response format`,
          this.name,
          true
        );
      }
      
      const result: VideoGenerationResult = {
        jobId,
        providerId: this.name,
        status: this.mapRunwayMLStatus(response.data.status),
        progress: response.data.progress || 0,
        metadata: {
          resolution: '1920x1080',
          format: 'mp4',
          generatedAt: new Date(),
          expectedSize: this.estimateFileSize(payload.duration || 8)
        }
      };
      
      // Store job mapping for polling
      await this.storeJobMapping(jobId, response.data.id, enhancedPrompt);
      
      // Start polling for status updates
      this.pollingManager.startPolling(jobId, response.data.id);
      
      
      return result;
      
    } catch (error: any) {
      
      if (error instanceof VideoProviderError) {
        throw error;
      }
      
      // Convert axios errors to provider errors
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.message;
        
        if (status === 401) {
          throw new VideoProviderError(
            VideoProviderErrorType.AUTHENTICATION_ERROR,
            'Invalid RunwayML API key',
            this.name
          );
        } else if (status === 429) {
          throw new VideoProviderError(
            VideoProviderErrorType.RATE_LIMIT_EXCEEDED,
            'RunwayML rate limit exceeded',
            this.name,
            true
          );
        } else if (status === 400) {
          throw new VideoProviderError(
            VideoProviderErrorType.INVALID_PARAMETERS,
            `Invalid parameters: ${message}`,
            this.name
          );
        } else if (status === 402) {
          throw new VideoProviderError(
            VideoProviderErrorType.INSUFFICIENT_CREDITS,
            'Insufficient RunwayML credits',
            this.name
          );
        }
      }
      
      throw new VideoProviderError(
        VideoProviderErrorType.NETWORK_ERROR,
        `Network error: ${error.message}`,
        this.name,
        true,
        error
      );
    }
  }
  
  async checkStatus(jobId: string): Promise<VideoGenerationStatus> {
    this.ensureInitialized();
    
    try {
      const runwayId = await this.getRunwayIdForJob(jobId);
      if (!runwayId) {
        throw new VideoProviderError(
          VideoProviderErrorType.INVALID_PARAMETERS,
          `Job ${jobId} not found`,
          this.name
        );
      }
      
      const response = await this.checkRunwayMLStatus(runwayId);
      
      return {
        jobId,
        providerId: this.name,
        status: this.mapRunwayMLStatus(response.status),
        progress: response.progress || 0,
        videoUrl: response.output,
        thumbnailUrl: response.thumbnailUrl,
        duration: response.metadata?.duration,
        error: response.error ? {
          code: response.error.code,
          message: response.error.message,
          retryable: this.isRetryableError(response.error.code)
        } : undefined,
        lastUpdated: new Date()
      };
      
    } catch (error: any) {
      
      if (error instanceof VideoProviderError) {
        throw error;
      }
      
      throw new VideoProviderError(
        VideoProviderErrorType.NETWORK_ERROR,
        `Status check failed: ${error.message}`,
        this.name,
        true,
        error
      );
    }
  }
  
  async checkRunwayMLStatus(runwayId: string): Promise<RunwayMLStatusResponse> {
    const response = await this.httpClient!.get<RunwayMLStatusResponse>(`/status/${runwayId}`);
    
    if (!response.data) {
      throw new VideoProviderError(
        VideoProviderErrorType.PROCESSING_ERROR,
        `Status check failed for ${runwayId}`,
        this.name,
        true
      );
    }
    
    return response.data;
  }
  
  async getHealthStatus(): Promise<ProviderHealthStatus> {
    try {
      const startTime = Date.now();
      
      // Simple health check by calling the API status endpoint
      await this.httpClient!.get('/health', {
        validateStatus: (status) => status < 500 // Accept 4xx as "healthy" for API access
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        providerId: this.name,
        isHealthy: true,
        responseTime,
        lastChecked: new Date(),
        uptime: 98.5, // Would be calculated from historical data
        errorRate: 1.5, // Would be calculated from historical data
        currentLoad: 35, // Would be calculated from current usage
        rateLimitStatus: {
          remaining: this.rateLimits.requestsPerMinute - 3 // Estimated
        }
      };
      
    } catch (error) {
      return {
        providerId: this.name,
        isHealthy: false,
        responseTime: 0,
        lastChecked: new Date(),
        uptime: 0,
        errorRate: 100,
        currentLoad: 100,
        rateLimitStatus: {
          remaining: 0
        },
        issues: [`Health check failed: ${error.message}`]
      };
    }
  }
  
  async getPerformanceMetrics(period: '1h' | '24h' | '7d' | '30d'): Promise<ProviderPerformanceMetrics> {
    // In a real implementation, this would query historical data from Firebase
    // For now, return mock metrics based on RunwayML's typical performance
    return {
      providerId: this.name,
      period,
      metrics: {
        successRate: 96.8,
        averageGenerationTime: 35, // seconds (slightly faster than HeyGen)
        averageVideoQuality: 9.5, // High quality for creative content
        userSatisfactionScore: 4.7,
        costEfficiency: 7.8,
        uptimePercentage: 98.5
      },
      lastUpdated: new Date()
    };
  }
  
  canHandle(requirements: VideoRequirements): boolean {
    // Check duration - RunwayML is optimized for short-form content
    if (requirements.duration > this.capabilities.maxDuration) {
      return false;
    }
    
    // Check resolution
    if (requirements.resolution === '4K' && this.capabilities.maxResolution === '1920x1080') {
      return false;
    }
    
    // Check format
    if (!this.capabilities.supportedFormats.includes(requirements.format.toLowerCase())) {
      return false;
    }
    
    // Check aspect ratio
    if (!this.capabilities.supportedAspectRatios.includes(requirements.aspectRatio)) {
      return false;
    }
    
    // RunwayML excels at creative and artistic content
    // Prefer it for premium quality levels and artistic requirements
    if (requirements.qualityLevel === 'premium') {
      return true;
    }
    
    // Don't handle if real-time updates are required (we use polling)
    if (requirements.features.realTimeUpdates && requirements.urgency === 'high') {
      return false;
    }
    
    return true;
  }
  
  async getEstimatedCost(options: VideoGenerationOptions): Promise<number> {
    const baseCost = this.rateLimits.costPerRequest || 0.75;
    
    // Adjust cost based on options
    let multiplier = 1.0;
    
    if (options.duration === 'long') {
      multiplier += 0.6; // Higher cost for longer videos
    } else if (options.duration === 'short') {
      multiplier -= 0.1; // Slightly less for shorter videos
    }
    
    if (options.style === 'energetic') {
      multiplier += 0.3; // Premium for dynamic content
    }
    
    return baseCost * multiplier;
  }
  
  /**
   * Enhanced prompt generation for creative video content
   */
  private async enhancePromptForVideo(
    script: string,
    options: VideoGenerationOptions
  ): Promise<RunwayMLPromptEnhancement> {
    const style = options.style || 'professional';
    const template = this.promptTemplates[style] || this.promptTemplates.professional;
    
    // Extract key elements from script for visual description
    const visualDescription = this.extractVisualElements(script);
    
    // Build enhanced prompt
    const enhancedPrompt = template.replace('{description}', visualDescription);
    
    // Add style modifiers
    const styleModifiers = this.getStyleModifiers(style, options);
    const motionSuggestions = this.getMotionSuggestions(style);
    
    // Calculate quality score based on prompt complexity and style matching
    const qualityScore = this.calculatePromptQuality(script, enhancedPrompt, style);
    
    return {
      originalPrompt: script,
      enhancedPrompt: `${enhancedPrompt}. ${styleModifiers.join('. ')}.`,
      styleModifiers,
      motionSuggestions,
      qualityScore
    };
  }
  
  private extractVisualElements(script: string): string {
    // Simple extraction - in production, this could use NLP for better results
    const lowercaseScript = script.toLowerCase();
    
    if (lowercaseScript.includes('developer') || lowercaseScript.includes('engineer')) {
      return 'a skilled software developer in a modern tech environment';
    } else if (lowercaseScript.includes('designer') || lowercaseScript.includes('creative')) {
      return 'a creative professional in an inspiring design workspace';
    } else if (lowercaseScript.includes('manager') || lowercaseScript.includes('leader')) {
      return 'a confident business leader in a professional setting';
    } else if (lowercaseScript.includes('consultant') || lowercaseScript.includes('advisor')) {
      return 'a professional consultant in an elegant office environment';
    } else {
      return 'a professional individual in a contemporary workplace';
    }
  }
  
  private getStyleModifiers(style: string, options: VideoGenerationOptions): string[] {
    const baseModifiers = [];
    
    switch (style) {
      case 'professional':
        baseModifiers.push('clean composition', 'professional lighting', 'minimal camera movement');
        break;
      case 'friendly':
        baseModifiers.push('warm lighting', 'approachable atmosphere', 'gentle camera movements');
        break;
      case 'energetic':
        baseModifiers.push('dynamic lighting', 'vibrant colors', 'creative camera angles');
        break;
    }
    
    // Add background-specific modifiers
    if (options.background === 'office') {
      baseModifiers.push('modern office environment');
    } else if (options.background === 'gradient') {
      baseModifiers.push('abstract gradient background');
    }
    
    return baseModifiers;
  }
  
  private getMotionSuggestions(style: string): string[] {
    switch (style) {
      case 'professional':
        return ['subtle zoom', 'slow pan', 'static with focus shift'];
      case 'friendly':
        return ['gentle dolly', 'smooth tracking', 'natural camera movement'];
      case 'energetic':
        return ['dynamic zoom', 'creative angles', 'rhythmic movement'];
      default:
        return ['smooth camera movement', 'professional cinematography'];
    }
  }
  
  private calculatePromptQuality(originalScript: string, enhancedPrompt: string, style: string): number {
    let score = 70; // Base score
    
    // Length and detail bonus
    if (enhancedPrompt.length > originalScript.length * 1.5) score += 10;
    
    // Style consistency bonus
    if (enhancedPrompt.toLowerCase().includes(style)) score += 10;
    
    // Visual detail bonus
    const visualKeywords = ['lighting', 'camera', 'composition', 'environment', 'atmosphere'];
    const matchedKeywords = visualKeywords.filter(keyword => 
      enhancedPrompt.toLowerCase().includes(keyword)
    ).length;
    score += matchedKeywords * 2;
    
    return Math.min(100, score);
  }
  
  private buildGenerationPayload(
    enhancedPrompt: RunwayMLPromptEnhancement,
    options: VideoGenerationOptions
  ): RunwayMLGenerationPayload {
    const style = options.style || 'professional';
    const styleConfig = this.styleConfigs[style];
    const duration = this.getDurationInSeconds(options.duration);
    
    return {
      model: 'gen2',
      prompt: enhancedPrompt.enhancedPrompt,
      aspect_ratio: '16:9', // Standard for CV presentations
      duration: Math.min(duration, 10), // RunwayML max duration
      motion: styleConfig.motionLevel as 'low' | 'medium' | 'high',
      style: styleConfig.style as 'cinematic' | 'artistic' | 'professional' | 'dynamic',
      enhance_prompt: styleConfig.enhancePrompt,
      seed: Math.floor(Math.random() * 1000000), // Random seed for variety
      camera_motion: {
        type: this.getCameraMotion(style),
        intensity: style === 'energetic' ? 0.8 : 0.4
      }
    };
  }
  
  private getCameraMotion(style: string): 'pan' | 'zoom' | 'tilt' | 'static' {
    switch (style) {
      case 'professional': return 'static';
      case 'friendly': return 'pan';
      case 'energetic': return 'zoom';
      default: return 'static';
    }
  }
  
  private getDurationInSeconds(duration?: string): number {
    switch (duration) {
      case 'short': return 4;
      case 'long': return 10;
      case 'medium':
      default: return 8;
    }
  }
  
  private estimateFileSize(duration: number): number {
    // Estimate file size in bytes (roughly 1MB per second for 1080p)
    return duration * 1024 * 1024;
  }
  
  private generateJobId(): string {
    return `runwayml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async validateAPIAccess(): Promise<void> {
    try {
      await this.httpClient!.get('/health', {
        validateStatus: (status) => status < 500
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new VideoProviderError(
          VideoProviderErrorType.AUTHENTICATION_ERROR,
          'Invalid RunwayML API key',
          this.name
        );
      }
      // Other errors are acceptable for initialization
    }
  }
  
  private async storeJobMapping(
    jobId: string, 
    runwayId: string, 
    enhancedPrompt: RunwayMLPromptEnhancement
  ): Promise<void> {
    try {
      const db = admin.firestore();
      await db.collection('runwayml_jobs').doc(jobId).set({
        jobId,
        runwayId,
        enhancedPrompt: enhancedPrompt.enhancedPrompt,
        originalPrompt: enhancedPrompt.originalPrompt,
        qualityScore: enhancedPrompt.qualityScore,
        styleModifiers: enhancedPrompt.styleModifiers,
        motionSuggestions: enhancedPrompt.motionSuggestions,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'queued',
        progress: 0
      });
    } catch (error) {
      // Non-critical error, don't throw
    }
  }
  
  private async getRunwayIdForJob(jobId: string): Promise<string | null> {
    try {
      const db = admin.firestore();
      const doc = await db.collection('runwayml_jobs').doc(jobId).get();
      return doc.exists ? doc.data()?.runwayId : null;
    } catch (error) {
      return null;
    }
  }
  
  private mapRunwayMLStatus(runwayStatus: string): 'queued' | 'processing' | 'completed' | 'failed' {
    switch (runwayStatus) {
      case 'pending': return 'queued';
      case 'processing': return 'processing';
      case 'succeeded': return 'completed';
      case 'failed': return 'failed';
      default: return 'queued';
    }
  }
  
  private isRetryableError(errorCode: string): boolean {
    const retryableErrors = [
      'RATE_LIMIT_EXCEEDED',
      'TEMPORARY_UNAVAILABLE',
      'PROCESSING_TIMEOUT',
      'NETWORK_ERROR',
      'SERVER_ERROR'
    ];
    return retryableErrors.includes(errorCode);
  }
  
  /**
   * Cleanup method to stop all polling when the service shuts down
   */
  cleanup(): void {
    this.pollingManager.stopAllPolling();
  }
}