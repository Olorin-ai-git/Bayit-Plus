/**
 * T024: CV Processing-specific logging implementation
 * CVPlus Logging System - CV Processing Module Logger
  */

import { BaseLogger } from '../core/BaseLogger';
import { LogLevel, LogDomain } from '../types';

export class ProcessingLogger extends BaseLogger {
  constructor(serviceName: string = 'cv-processing-service') {
    super(serviceName, {
      package: '@cvplus/cv-processing',
      level: LogLevel.INFO
    });
  }

  /**
   * Log CV processing start
    */
  processingStarted(context: {
    userId?: string;
    cvId?: string;
    requestedFeatures?: string[];
    fileSize?: number;
    fileType?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.INFO, 'CV processing started', {
      domain: LogDomain.BUSINESS,
      event: 'PROCESSING_STARTED',
      userId: context.userId,
      cvId: context.cvId,
      requestedFeatures: context.requestedFeatures,
      fileSize: context.fileSize,
      fileType: context.fileType
    });
  }

  /**
   * Log CV processing completion
    */
  processingCompleted(context: {
    cvId?: string;
    processingDuration?: number;
    featuresCompleted?: string[];
    qualityScore?: number;
    wordCount?: number;
    correlationId?: string;
  } = {}): string {
    const performance = context.processingDuration ? {
      duration: context.processingDuration
    } : undefined;

    return this.log(LogLevel.INFO, 'CV processing completed', {
      domain: LogDomain.PERFORMANCE,
      event: 'PROCESSING_COMPLETED',
      cvId: context.cvId,
      featuresCompleted: context.featuresCompleted,
      qualityScore: context.qualityScore,
      wordCount: context.wordCount,
      performance
    });
  }

  /**
   * Log CV processing failures
    */
  processingFailed(context: {
    cvId?: string;
    errorType?: string;
    errorMessage?: string;
    attemptedFeatures?: string[];
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

    return this.log(LogLevel.ERROR, 'CV processing failed', {
      domain: LogDomain.SYSTEM,
      event: 'PROCESSING_FAILED',
      cvId: context.cvId,
      errorType: context.errorType,
      attemptedFeatures: context.attemptedFeatures,
      error,
      performance
    });
  }

  /**
   * Log feature-specific processing events
    */
  featureProcessed(feature: string, data: any): string {
    const messageMap: Record<string, string> = {
      'ats_optimization': 'ATS optimization completed',
      'personality_insights': 'Personality insights generated',
      'skills_extraction': 'Skills extraction completed'
    };

    const message = messageMap[feature] || `Feature ${feature} processed`;

    return this.log(LogLevel.INFO, message, {
      domain: LogDomain.BUSINESS,
      event: 'FEATURE_PROCESSED',
      feature,
      ...data
    });
  }

  /**
   * Log AI service API calls
    */
  aiServiceCalled(context: {
    service?: string;
    endpoint?: string;
    tokens?: number;
    cost?: number;
    duration?: number;
    success?: boolean;
    correlationId?: string;
  } = {}): string {
    const performance = context.duration ? {
      duration: context.duration
    } : undefined;

    return this.log(LogLevel.INFO, 'AI service API call completed', {
      domain: LogDomain.PERFORMANCE,
      event: 'AI_SERVICE_CALLED',
      service: context.service,
      endpoint: context.endpoint,
      tokens: context.tokens,
      cost: context.cost,
      success: context.success,
      performance
    });
  }

  /**
   * Log retry attempts
    */
  retryAttempt(context: {
    cvId?: string;
    feature?: string;
    attempt?: number;
    maxAttempts?: number;
    lastError?: string;
    retryDelay?: number;
    correlationId?: string;
  } = {}): string {
    const error = context.lastError ? {
      message: context.lastError
    } : undefined;

    return this.log(LogLevel.WARN, 'Processing retry attempt', {
      domain: LogDomain.SYSTEM,
      event: 'RETRY_ATTEMPT',
      cvId: context.cvId,
      feature: context.feature,
      attempt: context.attempt,
      maxAttempts: context.maxAttempts,
      retryDelay: context.retryDelay,
      error
    });
  }

  /**
   * Execute callback with correlation ID context
    */
  withCorrelation(correlationId: string, callback: () => string): string {
    return super.withCorrelation(correlationId, callback);
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