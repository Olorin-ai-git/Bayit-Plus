export interface VideoRequirements {
  duration?: string;
  quality?: string;
  format?: string;
  resolution?: string;
}

export interface ProviderPerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  lastUpdateTime: number;
  totalRequests: number;
  metrics: {
    reliability: number;
    speed: number;
    quality: number;
    averageGenerationTime: number;
    averageVideoQuality: number;
    userSatisfactionScore: number;
  };
}

export interface ProviderHealthStatus {
  isHealthy: boolean;
  lastChecked: number;
  responseTime?: number;
  errorCount: number;
  uptime: number;
  errorRate: number;
}

export interface VideoProviderError {
  type: VideoProviderErrorType;
  message: string;
  code?: string;
  timestamp: number;
}

export enum VideoProviderErrorType {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  TIMEOUT = 'TIMEOUT',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  UNSUPPORTED_FEATURE = 'UNSUPPORTED_FEATURE'
}

export class VideoProviderError extends Error {
  constructor(
    public type: VideoProviderErrorType,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'VideoProviderError';
  }
}

export interface VideoGenerationProvider {
  id: string;
  name: string;
  priority?: number;
  capabilities: {
    maxDuration?: number;
    supportedFormats: string[];
    supportedResolutions: string[];
    voiceCloning?: boolean;
    customAvatars?: boolean;
    emotionControl?: boolean;
    voiceSpeedControl?: boolean;
    realTimeGeneration?: boolean;
  };
  generateVideo?(options: any): Promise<any>;
  getEstimatedCost?(options: any): Promise<number>;
  getHealthStatus?(): Promise<ProviderHealthStatus>;
  getPerformanceMetrics?(): Promise<ProviderPerformanceMetrics>;
  canHandle?(requirements: VideoRequirements): boolean;
}

export interface ProviderSelectionCriteria {
  requirements: VideoRequirements;
  preferences?: {
    speed?: number;
    quality?: number;
    cost?: number;
    prioritizeSpeed?: boolean;
    prioritizeQuality?: boolean;
    prioritizeCost?: boolean;
  };
  context?: {
    userId?: string;
    jobId?: string;
    urgency?: 'low' | 'medium' | 'high';
    budget?: number;
  };
}

export interface ProviderSelectionResult {
  selectedProvider: VideoGenerationProvider;
  fallbackProviders: VideoGenerationProvider[];
  selectionScore: number;
  reasoning: string;
  estimatedCost?: number;
  estimatedTime?: number;
}