// @ts-ignore - Export conflicts/**
 * HeyGen Video Generation Provider
 * 
 * Primary video generation provider using HeyGen API v2 with webhook support,
 * advanced avatar customization, and real-time status tracking.
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

interface HeyGenAvatarConfig {
  avatar_id: string;
  voice_id: string;
  style: string;
  emotion: string;
  background: string;
}

interface HeyGenGenerationPayload {
  video_inputs: [{
    character: {
      type: 'avatar';
      avatar_id: string;
      avatar_style?: string;
    };
    voice: {
      type: 'text';
      input_text: string;
      voice_id: string;
      speed?: number;
      emotion?: string;
    };
    background: {
      type: 'color' | 'image' | 'video';
      value: string;
    };
  }];
  dimension: {
    width: number;
    height: number;
  };
  aspect_ratio: '16:9' | '9:16' | '1:1';
  callback_id: string;
  webhook_url?: string;
  test?: boolean;
}

interface HeyGenAPIResponse {
  code: number;
  data: {
    video_id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    callback_id: string;
  };
  message: string;
}

interface HeyGenStatusResponse {
  code: number;
  data: {
    video_id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    callback_id: string;
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    file_size?: number;
    error?: {
      code: string;
      message: string;
    };
  };
  message: string;
}

interface HeyGenWebhookPayload {
  video_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  callback_id: string;
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  file_size?: number;
  error?: {
    code: string;
    message: string;
  };
}

export class HeyGenProvider extends BaseVideoProvider {
  readonly name = 'heygen';
  readonly priority = 1; // Highest priority
  
  readonly capabilities: ProviderCapabilities = {
    maxDuration: 300, // 5 minutes
    maxResolution: '1920x1080', // Can go up to 4K but 1080p for consistency
    supportedFormats: ['mp4', 'mov', 'webm'],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    voiceCloning: true,
    customAvatars: true,
    realTimeGeneration: true,
    backgroundCustomization: true,
    subtitleSupport: false, // HeyGen doesn't support direct subtitle generation
    multiLanguageSupport: true,
    emotionControl: true,
    voiceSpeedControl: true
  };
  
  readonly rateLimits: RateLimitConfig = {
    requestsPerMinute: 50,
    requestsPerHour: 1000,
    concurrentRequests: 10,
    dailyQuota: 2000,
    costPerRequest: 0.50 // Estimated cost per request
  };
  
  private httpClient: AxiosInstance | null = null;
  private baseUrl = 'https://api.heygen.com/v2';
  
  // HeyGen avatar configurations mapped to CVPlus styles
  private readonly avatarConfigs: Record<string, HeyGenAvatarConfig> = {
    professional: {
      avatar_id: 'Amy_20230126',
      voice_id: 'en-US-JennyNeural',
      style: 'professional',
      emotion: 'neutral',
      background: '#f8f9fa'
    },
    friendly: {
      avatar_id: 'Josh_20230126', 
      voice_id: 'en-US-GuyNeural',
      style: 'casual',
      emotion: 'friendly',
      background: '#e3f2fd'
    },
    energetic: {
      avatar_id: 'Maya_20230126',
      voice_id: 'en-US-AriaNeural',
      style: 'dynamic',
      emotion: 'enthusiastic',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }
  };
  
  // Background configurations
  private readonly backgroundConfigs: Record<string, { type: string; value: string }> = {
    office: {
      type: 'image',
      value: 'https://heygen-assets.s3.amazonaws.com/backgrounds/office_modern.jpg'
    },
    modern: {
      type: 'color',
      value: '#f8f9fa'
    },
    gradient: {
      type: 'color',
      value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    custom: {
      type: 'color',
      value: '#ffffff'
    }
  };
  
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
      const payload = this.buildGenerationPayload(script, options, jobId);
      
      
      const response = await this.httpClient!.post<HeyGenAPIResponse>(
        '/video/generate',
        payload
      );
      
      if (response.data.code !== 100) {
        throw new VideoProviderError(
          VideoProviderErrorType.PROCESSING_ERROR,
          `HeyGen API error: ${response.data.message}`,
          this.name,
          true
        );
      }
      
      const result: VideoGenerationResult = {
        jobId,
        providerId: this.name,
        status: response.data.data.status,
        progress: response.data.data.status === 'queued' ? 0 : 10,
        metadata: {
          resolution: '1920x1080',
          format: 'mp4',
          generatedAt: new Date()
        }
      };
      
      // Store job mapping for webhook handling
      await this.storeJobMapping(jobId, response.data.data.video_id);
      
      
      return result;
      
    } catch (error: any) {
      
      if (error instanceof VideoProviderError) {
        throw error;
      }
      
      // Convert axios errors to provider errors
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.message;
        
        if (status === 401) {
          throw new VideoProviderError(
            VideoProviderErrorType.AUTHENTICATION_ERROR,
            'Invalid HeyGen API key',
            this.name
          );
        } else if (status === 429) {
          throw new VideoProviderError(
            VideoProviderErrorType.RATE_LIMIT_EXCEEDED,
            'HeyGen rate limit exceeded',
            this.name,
            true
          );
        } else if (status === 400) {
          throw new VideoProviderError(
            VideoProviderErrorType.INVALID_PARAMETERS,
            `Invalid parameters: ${message}`,
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
      const videoId = await this.getVideoIdForJob(jobId);
      if (!videoId) {
        throw new VideoProviderError(
          VideoProviderErrorType.INVALID_PARAMETERS,
          `Job ${jobId} not found`,
          this.name
        );
      }
      
      const response = await this.httpClient!.get<HeyGenStatusResponse>(
        `/video/status/${videoId}`
      );
      
      if (response.data.code !== 100) {
        throw new VideoProviderError(
          VideoProviderErrorType.PROCESSING_ERROR,
          `Status check failed: ${response.data.message}`,
          this.name,
          true
        );
      }
      
      const data = response.data.data;
      
      return {
        jobId,
        providerId: this.name,
        status: data.status,
        progress: data.progress,
        videoUrl: data.video_url,
        thumbnailUrl: data.thumbnail_url,
        duration: data.duration,
        error: data.error ? {
          code: data.error.code,
          message: data.error.message,
          retryable: this.isRetryableError(data.error.code)
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
  
  async getHealthStatus(): Promise<ProviderHealthStatus> {
    try {
      const startTime = Date.now();
      
      // Simple health check by calling the status endpoint with a dummy ID
      await this.httpClient!.get('/video/status/health-check', {
        validateStatus: (status) => status < 500 // Accept 4xx as "healthy" for API access
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        providerId: this.name,
        isHealthy: true,
        responseTime,
        lastChecked: new Date(),
        uptime: 99.9, // Would be calculated from historical data
        errorRate: 0.1, // Would be calculated from historical data
        currentLoad: 25, // Would be calculated from current usage
        rateLimitStatus: {
          remaining: this.rateLimits.requestsPerMinute - 5 // Estimated
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
    // For now, return mock metrics based on HeyGen's typical performance
    return {
      providerId: this.name,
      period,
      metrics: {
        successRate: 98.5,
        averageGenerationTime: 45, // seconds
        averageVideoQuality: 9.2,
        userSatisfactionScore: 4.6,
        costEfficiency: 8.5,
        uptimePercentage: 99.8
      },
      lastUpdated: new Date()
    };
  }
  
  canHandle(requirements: VideoRequirements): boolean {
    // Check duration
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
    
    // Check required features
    if (requirements.features.voiceCloning && !this.capabilities.voiceCloning) {
      return false;
    }
    
    if (requirements.features.customAvatar && !this.capabilities.customAvatars) {
      return false;
    }
    
    if (requirements.features.realTimeUpdates && !this.capabilities.realTimeGeneration) {
      return false;
    }
    
    return true;
  }
  
  async getEstimatedCost(options: VideoGenerationOptions): Promise<number> {
    const baseCost = this.rateLimits.costPerRequest || 0.50;
    
    // Adjust cost based on options
    let multiplier = 1.0;
    
    if (options.duration === 'long') {
      multiplier += 0.5; // 50% more for longer videos
    } else if (options.duration === 'short') {
      multiplier -= 0.2; // 20% less for shorter videos
    }
    
    if (options.avatarStyle === 'realistic') {
      multiplier += 0.3; // Premium for realistic avatars
    }
    
    if (options.customAvatarId) {
      multiplier += 0.4; // Premium for custom avatars
    }
    
    return baseCost * multiplier;
  }
  
  async handleWebhook(payload: HeyGenWebhookPayload): Promise<VideoGenerationStatus> {
    try {
      
      // Validate webhook payload
      if (!payload.video_id || !payload.callback_id) {
        throw new VideoProviderError(
          VideoProviderErrorType.WEBHOOK_ERROR,
          'Invalid webhook payload: missing required fields',
          this.name
        );
      }
      
      // Get the job ID from callback_id
      const jobId = payload.callback_id;
      
      const status: VideoGenerationStatus = {
        jobId,
        providerId: this.name,
        status: payload.status,
        progress: payload.progress,
        videoUrl: payload.video_url,
        thumbnailUrl: payload.thumbnail_url,
        duration: payload.duration,
        error: payload.error ? {
          code: payload.error.code,
          message: payload.error.message,
          retryable: this.isRetryableError(payload.error.code)
        } : undefined,
        lastUpdated: new Date()
      };
      
      // Update job status in Firestore
      await this.updateJobStatus(jobId, status);
      
      
      return status;
      
    } catch (error: any) {
      throw new VideoProviderError(
        VideoProviderErrorType.WEBHOOK_ERROR,
        `Webhook processing failed: ${error.message}`,
        this.name,
        false,
        error
      );
    }
  }
  
  private buildGenerationPayload(
    script: string,
    options: VideoGenerationOptions,
    jobId: string
  ): HeyGenGenerationPayload {
    const style = options.style || 'professional';
    const avatarConfig = this.avatarConfigs[style];
    const background = this.backgroundConfigs[options.background || 'modern'];
    
    // Calculate dimensions based on duration
    const dimensions = this.getDimensions(options.duration);
    
    return {
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id: options.customAvatarId || avatarConfig.avatar_id,
          avatar_style: avatarConfig.style
        },
        voice: {
          type: 'text',
          input_text: script,
          voice_id: options.customVoiceId || avatarConfig.voice_id,
          speed: options.voiceSpeed || 1.0,
          emotion: options.emotion || avatarConfig.emotion
        },
        background: {
          type: background.type as 'color' | 'image' | 'video',
          value: background.value
        }
      }],
      dimension: dimensions,
      aspect_ratio: '16:9',
      callback_id: jobId,
      webhook_url: this.config?.webhookUrl,
      test: false
    };
  }
  
  private getDimensions(duration?: string): { width: number; height: number } {
    // Standard 1080p for all videos
    return { width: 1920, height: 1080 };
  }
  
  private generateJobId(): string {
    return `heygen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async validateAPIAccess(): Promise<void> {
    try {
      await this.httpClient!.get('/video/status/health-check', {
        validateStatus: (status) => status < 500
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new VideoProviderError(
          VideoProviderErrorType.AUTHENTICATION_ERROR,
          'Invalid HeyGen API key',
          this.name
        );
      }
      // Other errors are acceptable for initialization
    }
  }
  
  private async storeJobMapping(jobId: string, videoId: string): Promise<void> {
    try {
      const db = admin.firestore();
      await db.collection('heygen_jobs').doc(jobId).set({
        videoId,
        jobId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'queued'
      });
    } catch (error) {
      // Non-critical error, don't throw
    }
  }
  
  private async getVideoIdForJob(jobId: string): Promise<string | null> {
    try {
      const db = admin.firestore();
      const doc = await db.collection('heygen_jobs').doc(jobId).get();
      return doc.exists ? doc.data()?.videoId : null;
    } catch (error) {
      return null;
    }
  }
  
  private async updateJobStatus(jobId: string, status: VideoGenerationStatus): Promise<void> {
    try {
      const db = admin.firestore();
      await db.collection('heygen_jobs').doc(jobId).update({
        status: status.status,
        progress: status.progress,
        videoUrl: status.videoUrl,
        thumbnailUrl: status.thumbnailUrl,
        duration: status.duration,
        error: status.error,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Also update the main job document if it exists
      try {
        const jobDoc = await db.collection('jobs').doc(jobId).get();
        if (jobDoc.exists) {
          await db.collection('jobs').doc(jobId).update({
            'videoGeneration.status': status.status,
            'videoGeneration.progress': status.progress,
            'videoGeneration.videoUrl': status.videoUrl,
            'videoGeneration.provider': this.name,
            'videoGeneration.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (jobUpdateError) {
      }
      
    } catch (error) {
      throw error;
    }
  }
  
  private isRetryableError(errorCode: string): boolean {
    const retryableErrors = [
      'RATE_LIMIT_EXCEEDED',
      'TEMPORARY_UNAVAILABLE',
      'PROCESSING_TIMEOUT',
      'NETWORK_ERROR'
    ];
    return retryableErrors.includes(errorCode);
  }
}