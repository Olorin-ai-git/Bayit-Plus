/**
 * T025: Multimedia-specific logging implementation
 * CVPlus Logging System - Multimedia Module Logger
  */

import { BaseLogger } from '../core/BaseLogger';
import { LogLevel, LogDomain } from '../types';

export class MultimediaLogger extends BaseLogger {
  constructor(serviceName: string = 'multimedia-service') {
    super(serviceName, {
      package: '@cvplus/multimedia',
      level: LogLevel.INFO
    });
  }

  /**
   * Log media upload started
    */
  mediaUploadStarted(context: {
    userId?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    uploadMethod?: string;
    processingIntent?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.INFO, 'Media upload started', {
      domain: LogDomain.BUSINESS,
      event: 'MEDIA_UPLOAD_STARTED',
      userId: context.userId,
      fileName: context.fileName,
      fileSize: context.fileSize,
      fileType: context.fileType,
      uploadMethod: context.uploadMethod,
      processingIntent: context.processingIntent
    });
  }

  /**
   * Log video generation started
    */
  videoGenerationStarted(context: {
    userId?: string;
    videoType?: string;
    aiService?: string;
    scriptLength?: number;
    avatarId?: string;
    resolution?: string;
    estimatedDuration?: number;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.INFO, 'AI video generation started', {
      domain: LogDomain.BUSINESS,
      event: 'VIDEO_GENERATION_STARTED',
      userId: context.userId,
      videoType: context.videoType,
      aiService: context.aiService,
      scriptLength: context.scriptLength,
      avatarId: context.avatarId,
      resolution: context.resolution
    });
  }

  /**
   * Log audio processing completed
    */
  audioProcessingCompleted(context: {
    audioId?: string;
    processingType?: string;
    aiService?: string;
    voiceId?: string;
    textLength?: number;
    qualitySettings?: string;
    outputFormat?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.INFO, 'Audio processing completed', {
      domain: LogDomain.PERFORMANCE,
      event: 'AUDIO_PROCESSING_COMPLETED',
      audioId: context.audioId,
      processingType: context.processingType,
      aiService: context.aiService,
      voiceId: context.voiceId,
      textLength: context.textLength,
      qualitySettings: context.qualitySettings,
      outputFormat: context.outputFormat
    });
  }

  /**
   * Log media storage operations
    */
  storageOperation(context: {
    operation?: string;
    bucketName?: string;
    filePath?: string;
    fileSize?: number;
    storageClass?: string;
    metadata?: Record<string, any>;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.INFO, 'Media storage operation completed', {
      domain: LogDomain.SYSTEM,
      event: 'STORAGE_OPERATION',
      operation: context.operation,
      bucketName: context.bucketName,
      filePath: context.filePath,
      fileSize: context.fileSize,
      storageClass: context.storageClass
    });
  }

  /**
   * Log AI service calls with costs
    */
  aiServiceCalled(context: {
    service?: string;
    endpoint?: string;
    requestType?: string;
    inputTokens?: number;
    credits?: number;
    cost?: number;
    duration?: number;
    success?: boolean;
    responseSize?: string;
    correlationId?: string;
  } = {}): string {
    const performance = context.duration ? {
      duration: context.duration
    } : undefined;

    return this.log(LogLevel.INFO, 'AI service call completed', {
      domain: LogDomain.PERFORMANCE,
      event: 'AI_SERVICE_CALLED',
      service: context.service,
      endpoint: context.endpoint,
      requestType: context.requestType,
      credits: context.credits,
      cost: context.cost,
      success: context.success,
      performance
    });
  }

  /**
   * Log processing failures
    */
  processingFailed(context: {
    mediaId?: string;
    processingType?: string;
    errorType?: string;
    errorMessage?: string;
    originalFormat?: string;
    targetFormat?: string;
    recoveryStrategy?: string;
    processingDuration?: number;
    correlationId?: string;
  } = {}): string {
    const error = context.errorMessage ? {
      message: context.errorMessage,
      code: context.errorType
    } : undefined;

    const performance = context.processingDuration ? {
      duration: context.processingDuration
    } : undefined;

    return this.log(LogLevel.ERROR, 'Media processing failed', {
      domain: LogDomain.SYSTEM,
      event: 'PROCESSING_FAILED',
      mediaId: context.mediaId,
      processingType: context.processingType,
      errorType: context.errorType,
      originalFormat: context.originalFormat,
      targetFormat: context.targetFormat,
      recoveryStrategy: context.recoveryStrategy,
      error,
      performance
    });
  }

  /**
   * Log processing completion with performance metrics
    */
  processingCompleted(context: {
    mediaId?: string;
    processingDuration?: number;
    fileSize?: number;
    processingType?: string;
    qualityScore?: number;
    correlationId?: string;
  } = {}): string {
    const performance = context.processingDuration ? {
      duration: context.processingDuration
    } : undefined;

    return this.log(LogLevel.INFO, 'Media processing completed', {
      domain: LogDomain.PERFORMANCE,
      event: 'PROCESSING_COMPLETED',
      mediaId: context.mediaId,
      fileSize: context.fileSize,
      processingType: context.processingType,
      qualityScore: context.qualityScore,
      performance
    });
  }

  /**
   * Log storage quota warnings
    */
  quotaWarning(context: {
    userId?: string;
    currentUsage?: number;
    quotaLimit?: number;
    utilizationPercent?: number;
    mediaTypes?: Record<string, number>;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.WARN, 'User approaching storage quota limit', {
      domain: LogDomain.SYSTEM,
      event: 'QUOTA_WARNING',
      userId: context.userId,
      currentUsage: context.currentUsage,
      quotaLimit: context.quotaLimit,
      utilizationPercent: context.utilizationPercent
    });
  }

  /**
   * Get last log entry (for testing)
    */
  getLastLogEntry() {
    return super.getLastLogEntry();
  }

  /**
   * Get all log entries (for testing)
    */
  getAllLogEntries() {
    return super.getAllLogEntries();
  }
}