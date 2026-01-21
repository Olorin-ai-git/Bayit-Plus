/**
 * Base Provider Interface for Video Generation Services
 * 
 * Defines the common interface for all video generation providers
 * (HeyGen, D-ID, RunwayML, etc.) with capabilities, rate limits, and health monitoring.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { ParsedCV } from '../../types/enhanced-models';

export interface VideoGenerationOptions {
  duration?: 'short' | 'medium' | 'long'; // 30s, 60s, 90s
  style?: 'professional' | 'friendly' | 'energetic';
  avatarStyle?: 'realistic' | 'illustrated' | 'corporate';
  background?: 'office' | 'modern' | 'gradient' | 'custom';
  includeSubtitles?: boolean;
  includeNameCard?: boolean;
  jobId?: string;
  webhookUrl?: string;
  resolution?: string;
  format?: string;
  features?: string[];
  // HeyGen specific options
  voiceSpeed?: number; // 0.8 - 1.2
  emotion?: 'neutral' | 'happy' | 'serious' | 'enthusiastic';
  customAvatarId?: string;
  customVoiceId?: string;
}

export interface VideoGenerationResult {
  jobId: string;
  providerId: string;
  success?: boolean;
  qualityScore?: number;
  videoUrl?: string; // Available immediately for synchronous providers
  thumbnailUrl?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100 for providers that support progress tracking
  estimatedDuration?: number; // Estimated video duration in seconds
  metadata: {
    resolution: string;
    format: string;
    expectedSize?: number;
    generatedAt: Date;
    providerId?: string;
    duration?: number;
    size?: number;
    promptTokens?: number;
    outputSize?: number;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    type?: string;
  };
}

export interface VideoGenerationStatus {
  jobId: string;
  providerId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  lastUpdated: Date;
}

export interface ProviderCapabilities {
  maxDuration: number; // Maximum video duration in seconds
  maxResolution: string; // e.g., '1920x1080', '4K'
  supportedFormats: string[]; // ['mp4', 'mov', 'webm']
  supportedAspectRatios: string[]; // ['16:9', '9:16', '1:1']
  voiceCloning: boolean;
  customAvatars: boolean;
  realTimeGeneration: boolean; // Supports webhook/real-time status updates
  backgroundCustomization: boolean;
  subtitleSupport: boolean;
  multiLanguageSupport: boolean;
  emotionControl: boolean;
  voiceSpeedControl: boolean;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour?: number;
  concurrentRequests: number;
  dailyQuota?: number;
  costPerRequest?: number; // in credits or currency
}

export interface ProviderHealthStatus {
  providerId: string;
  isHealthy: boolean;
  responseTime: number; // in milliseconds
  lastChecked: Date;
  uptime: number; // percentage
  errorRate: number; // percentage
  currentLoad: number; // percentage of capacity
  rateLimitStatus: {
    remaining: number;
    resetTime?: Date;
  };
  issues?: string[];
}

export interface ProviderPerformanceMetrics {
  providerId: string;
  period: '1h' | '24h' | '7d' | '30d';
  metrics: {
    successRate: number; // percentage
    averageGenerationTime: number; // in seconds
    averageVideoQuality: number; // 1-10 scale
    userSatisfactionScore: number; // 1-5 scale
    costEfficiency: number; // quality/cost ratio
    uptimePercentage: number;
  };
  lastUpdated: Date;
}

/**
 * Base interface that all video generation providers must implement
  */
export interface VideoGenerationProvider {
  readonly name: string;
  readonly priority: number; // 1 = highest priority
  readonly capabilities: ProviderCapabilities;
  readonly rateLimits: RateLimitConfig;
  
  /**
   * Initialize the provider with configuration
    */
  initialize(config: ProviderConfig): Promise<void>;
  
  /**
   * Generate a video using the provider's API
    */
  generateVideo(
    script: string,
    options: VideoGenerationOptions
  ): Promise<VideoGenerationResult>;
  
  /**
   * Check the status of a video generation job
    */
  checkStatus(jobId: string): Promise<VideoGenerationStatus>;
  
  /**
   * Cancel a video generation job if supported
    */
  cancelJob?(jobId: string): Promise<boolean>;
  
  /**
   * Get the current health status of the provider
    */
  getHealthStatus(): Promise<ProviderHealthStatus>;
  
  /**
   * Get performance metrics for the provider
    */
  getPerformanceMetrics(period: '1h' | '24h' | '7d' | '30d'): Promise<ProviderPerformanceMetrics>;
  
  /**
   * Validate if the provider can handle the given requirements
    */
  canHandle(requirements: VideoRequirements): boolean;
  
  /**
   * Get estimated cost for video generation
    */
  getEstimatedCost(options: VideoGenerationOptions): Promise<number>;
  
  /**
   * Handle webhook callbacks if supported
    */
  handleWebhook?(payload: any): Promise<VideoGenerationStatus>;
}

export interface VideoRequirements {
  duration: number; // in seconds
  resolution: string; // e.g., '1920x1080'
  format: string; // e.g., 'mp4'
  aspectRatio: string; // e.g., '16:9'
  features: {
    customAvatar?: boolean;
    voiceCloning?: boolean;
    realTimeUpdates?: boolean;
    backgroundCustomization?: boolean;
    subtitles?: boolean;
    emotionControl?: boolean;
  };
  urgency: 'low' | 'normal' | 'high'; // Affects provider selection
  qualityLevel: 'basic' | 'standard' | 'premium';
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  webhookSecret?: string;
  webhookUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  customSettings?: Record<string, any>;
}

/**
 * Error types specific to video generation providers
  */
export enum VideoProviderErrorType {
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_PARAMETERS = 'invalid_parameters',
  INSUFFICIENT_CREDITS = 'insufficient_credits',
  PROCESSING_ERROR = 'processing_error',
  TIMEOUT_ERROR = 'timeout_error',
  NETWORK_ERROR = 'network_error',
  WEBHOOK_ERROR = 'webhook_error',
  UNSUPPORTED_FEATURE = 'unsupported_feature',
  QUOTA_EXCEEDED = 'quota_exceeded',
  PROVIDER_UNAVAILABLE = 'provider_unavailable'
}

export class VideoProviderError extends Error {
  constructor(
    public type: VideoProviderErrorType,
    message: string,
    public providerId: string,
    public retryable: boolean = false,
    public originalError?: any
  ) {
    super(message);
    this.name = 'VideoProviderError';
  }
}

/**
 * Provider selection criteria for intelligent routing
  */
export interface ProviderSelectionCriteria {
  requirements: VideoRequirements;
  preferences: {
    prioritizeSpeed?: boolean;
    prioritizeQuality?: boolean;
    prioritizeCost?: boolean;
    allowFallback?: boolean;
  };
  context: {
    userTier: 'free' | 'premium' | 'enterprise';
    currentLoad: number;
    timeOfDay: number; // 0-23
    isRetry?: boolean;
    previousFailures?: string[]; // Provider IDs that have failed
    urgency?: 'low' | 'normal' | 'high'; // Request urgency level
  };
}

/**
 * Provider selection result with scoring details
  */
export interface ProviderSelectionResult {
  selectedProvider: VideoGenerationProvider;
  fallbackProviders: VideoGenerationProvider[];
  selectionScore: number; // 0-100
  reasoning: string[];
  estimatedCost: number;
  estimatedTime: number; // in seconds
}

/**
 * Factory pattern for creating providers
  */
export abstract class BaseVideoProvider implements VideoGenerationProvider {
  abstract readonly name: string;
  abstract readonly priority: number;
  abstract readonly capabilities: ProviderCapabilities;
  abstract readonly rateLimits: RateLimitConfig;
  
  protected config: ProviderConfig | null = null;
  protected isInitialized = false;
  
  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
    this.isInitialized = true;
  }
  
  protected ensureInitialized(): void {
    if (!this.isInitialized || !this.config) {
      throw new VideoProviderError(
        VideoProviderErrorType.AUTHENTICATION_ERROR,
        'Provider not initialized',
        this.name
      );
    }
  }
  
  // Abstract methods that must be implemented by concrete providers
  abstract generateVideo(script: string, options: VideoGenerationOptions): Promise<VideoGenerationResult>;
  abstract checkStatus(jobId: string): Promise<VideoGenerationStatus>;
  abstract getHealthStatus(): Promise<ProviderHealthStatus>;
  abstract getPerformanceMetrics(period: '1h' | '24h' | '7d' | '30d'): Promise<ProviderPerformanceMetrics>;
  abstract canHandle(requirements: VideoRequirements): boolean;
  abstract getEstimatedCost(options: VideoGenerationOptions): Promise<number>;
}