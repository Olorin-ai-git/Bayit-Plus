/**
 * Base Video Provider Interface
 * Defines common types and interfaces for video generation providers
  */

export interface VideoGenerationOptions {
  duration?: 'short' | 'medium' | 'long';
  style?: 'professional' | 'friendly' | 'energetic';
  quality?: 'low' | 'medium' | 'high';
  customVoiceId?: string;
  backgroundMusic?: boolean;
  includeSubtitles?: boolean;
}

export interface VideoGenerationResult {
  videoUrl: string;
  duration: number;
  format: string;
  size: number;
  metadata?: Record<string, any>;
}

export interface ProviderSelectionCriteria {
  requiredFeatures: string[];
  qualityPreference: 'low' | 'medium' | 'high';
  speedPriority: 'fast' | 'balanced' | 'quality';
  budgetLimit?: number;
}

export enum VideoProviderErrorType {
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  TIMEOUT_ERROR = 'timeout_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  INSUFFICIENT_CREDITS = 'insufficient_credits',
  NETWORK_ERROR = 'network_error',
  QUOTA_EXCEEDED = 'quota_exceeded',
  PROVIDER_UNAVAILABLE = 'provider_unavailable',
  PROCESSING_ERROR = 'processing_error',
  INVALID_PARAMETERS = 'invalid_parameters',
  UNSUPPORTED_FEATURE = 'unsupported_feature'
}

export class VideoProviderError extends Error {
  public readonly type: VideoProviderErrorType;
  public readonly providerId: string;
  public readonly retryable: boolean;

  constructor(type: VideoProviderErrorType, message: string, providerId: string, retryable: boolean = false) {
    super(message);
    this.name = 'VideoProviderError';
    this.type = type;
    this.providerId = providerId;
    this.retryable = retryable;
  }
}

export interface VideoGenerationProvider {
  id: string;
  name: string;
  capabilities: {
    maxDuration: number;
    supportedQualities: string[];
    voiceCloning: boolean;
    customBackgrounds: boolean;
    subtitles: boolean;
  };
  pricing: {
    costPerMinute: number;
    freeMinutesPerMonth?: number;
  };
}

export interface ProviderSelectionResult {
  providerId: string;
  provider: VideoGenerationProvider;
  confidence: number;
  reasoning: string;
}

export interface VideoRequirements {
  duration: 'short' | 'medium' | 'long';
  quality: 'low' | 'medium' | 'high';
  features: string[];
  budget?: number;
}

// Additional exports required by provider-selection-engine
export interface ProviderPerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  qualityScore: number;
  costEfficiency: number;
  lastUpdated: Date;
}

export interface ProviderHealthStatus {
  status: 'healthy' | 'degraded' | 'unavailable';
  uptime: number;
  lastHealthCheck: Date;
  issues?: string[];
}