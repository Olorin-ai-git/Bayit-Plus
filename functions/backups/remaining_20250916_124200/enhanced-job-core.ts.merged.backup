// @ts-ignore - Export conflicts/**
 * Enhanced Job Core Types
 * 
 * Core job processing types for enhanced CV features.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

export interface JobProcessingCore {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  estimatedCompletionTime?: Date;
  actualCompletionTime?: Date;
}

export interface JobConfiguration {
  maxRetries: number;
  timeoutMs: number;
  processInBackground: boolean;
  notifyOnCompletion: boolean;
  preserveResults: boolean;
}

export interface JobResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
  processingTime?: number;
}

export interface JobProgress {
  percentage: number;
  stage: string;
  message?: string;
  estimatedTimeRemaining?: number;
}

export type JobEventType = 'started' | 'progress' | 'completed' | 'failed' | 'cancelled';

export interface JobEvent {
  type: JobEventType;
  timestamp: Date;
  data?: any;
  message?: string;
}

export interface FeatureState {
  enabled: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data?: any;
  error?: string;
  processedAt?: Date;
}

export interface EnhancedJob extends JobProcessingCore {
  type: 'cv-parsing' | 'video-generation' | 'audio-processing' | 'qr-generation' | 'portfolio-creation';
  userId: string;
  configuration: JobConfiguration;
  progress: JobProgress;
  events: JobEvent[];
  result?: JobResult;
  parsedData?: any;
  enhancedFeatures?: {
    aiRecommendations?: boolean;
    videoIntroduction?: FeatureState;
    audioPodcast?: FeatureState;
    careerPodcast?: FeatureState;
    portfolioGallery?: boolean;
    qrCodeEnhancement?: boolean;
    socialIntegration?: boolean;
    calendarBooking?: boolean;
    publicProfile?: boolean;
  };
}