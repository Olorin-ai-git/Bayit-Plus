/**
 * Error Recovery Engine
 * 
 * Comprehensive error classification, recovery strategies, and intelligent
 * fallback mechanisms for video generation failures.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// TEMPORARILY DISABLED: Import from staging area not available
// Placeholder types for video provider interfaces
interface VideoGenerationProvider { 
  id: string; 
  name: string;
  capabilities?: {
    voiceCloning?: boolean;
    customAvatars?: boolean;
    emotionControl?: boolean;
    voiceSpeedControl?: boolean;
  };
}

export enum VideoProviderErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH', 
  QUOTA = 'QUOTA',
  SERVICE = 'SERVICE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  UNSUPPORTED_FEATURE = 'UNSUPPORTED_FEATURE'
}

export class VideoProviderError extends Error {
  public type: VideoProviderErrorType;
  public retryable?: boolean;
  
  constructor(type: VideoProviderErrorType, message: string, retryable = false) {
    super(message);
    this.type = type;
    this.retryable = retryable;
    this.name = 'VideoProviderError';
  }
}

interface VideoGenerationOptions { 
  script?: string; 
  template?: string;
  duration?: number | string;
  style?: string;
  avatarStyle?: string;
  background?: string;
  includeSubtitles?: boolean;
  customAvatarId?: string;
  customVoiceId?: string;
  emotion?: string;
  voiceSpeed?: number;
}

interface VideoGenerationResult { 
  success: boolean; 
  url?: string; 
  error?: string; 
}

interface ProviderSelectionCriteria {
  priority?: number;
  reliability?: number;
  context?: any;
  requirements?: any;
  preferences?: {
    speed?: number;
    quality?: number;
    cost?: number;
    prioritizeSpeed?: boolean;
    prioritizeQuality?: boolean;
    prioritizeCost?: boolean;
  };
}
import { ProviderSelectionEngine } from './provider-selection-engine.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import * as admin from 'firebase-admin';

export enum ErrorCategory {
  TRANSIENT_ERROR = 'transient',
  RATE_LIMIT = 'rate_limit',
  API_FAILURE = 'api_failure',
  QUALITY_FAILURE = 'quality_failure',
  TIMEOUT = 'timeout',
  AUTHENTICATION = 'authentication',
  PROVIDER_OVERLOAD = 'provider_overload',
  SYSTEM_ERROR = 'system_error',
  NETWORK_ERROR = 'network_error',
  QUOTA_EXCEEDED = 'quota_exceeded',
  PROCESSING_ERROR = 'processing_error'
}

export enum BackoffStrategy {
  EXPONENTIAL = 'exponential',
  LINEAR = 'linear',
  FIXED = 'fixed',
  FIBONACCI = 'fibonacci'
}

export enum FallbackAction {
  RETRY_SAME_PROVIDER = 'retry_same',
  SWITCH_PROVIDER = 'switch_provider',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  FAIL_FAST = 'fail_fast',
  QUEUE_FOR_LATER = 'queue_later'
}

interface RecoveryStrategy {
  category: ErrorCategory;
  maxRetries: number;
  backoffStrategy: BackoffStrategy;
  baseDelayMs: number;
  maxDelayMs: number;
  fallbackAction: FallbackAction;
  alertThreshold: number;
  circuitBreakerEnabled: boolean;
  quality: {
    allowQualityDegradation: boolean;
    minimumQualityThreshold: number;
  };
}

interface RecoveryContext {
  jobId: string;
  providerId: string;
  script: string;
  options: VideoGenerationOptions;
  originalCriteria: ProviderSelectionCriteria;
  attempt: number;
  startTime: Date;
  previousErrors: ErrorRecord[];
  userTier: 'free' | 'premium' | 'enterprise';
}

interface ErrorRecord {
  timestamp: Date;
  providerId: string;
  category: ErrorCategory;
  errorType: VideoProviderErrorType;
  message: string;
  retryable: boolean;
  recoveryAction: FallbackAction;
}

interface RecoveryResult {
  success: boolean;
  result?: VideoGenerationResult;
  action: FallbackAction;
  newProviderId?: string;
  attemptsUsed: number;
  totalRecoveryTime: number;
  errorHistory: ErrorRecord[];
  finalError?: VideoProviderError;
}

/**
 * Exponential Backoff Calculator
  */
class BackoffCalculator {
  static calculateDelay(
    strategy: BackoffStrategy,
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number
  ): number {
    let delay: number;

    switch (strategy) {
      case BackoffStrategy.EXPONENTIAL:
        delay = baseDelayMs * Math.pow(2, attempt - 1);
        break;
      
      case BackoffStrategy.LINEAR:
        delay = baseDelayMs * attempt;
        break;
      
      case BackoffStrategy.FIBONACCI:
        delay = baseDelayMs * this.fibonacci(attempt);
        break;
      
      case BackoffStrategy.FIXED:
      default:
        delay = baseDelayMs;
        break;
    }

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    delay += jitter;

    return Math.min(delay, maxDelayMs);
  }

  private static fibonacci(n: number): number {
    if (n <= 1) return 1;
    if (n === 2) return 2;
    
    let a = 1, b = 2;
    for (let i = 3; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  }
}

/**
 * Error Recovery Engine
  */
export class ErrorRecoveryEngine {
  private recoveryStrategies: Map<ErrorCategory, RecoveryStrategy> = new Map();
  private providerSelectionEngine: ProviderSelectionEngine;
  private circuitBreaker: CircuitBreakerService;
  private db: admin.firestore.Firestore;
  // Removed unused property

  constructor(
    providerSelectionEngine: ProviderSelectionEngine,
    circuitBreaker: CircuitBreakerService
  ) {
    this.providerSelectionEngine = providerSelectionEngine;
    this.circuitBreaker = circuitBreaker;
    this.db = admin.firestore();
    this.initializeRecoveryStrategies();
  }

  private initializeRecoveryStrategies(): void {
    this.recoveryStrategies = new Map([
      [ErrorCategory.TRANSIENT_ERROR, {
        category: ErrorCategory.TRANSIENT_ERROR,
        maxRetries: 3,
        backoffStrategy: BackoffStrategy.EXPONENTIAL,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        fallbackAction: FallbackAction.RETRY_SAME_PROVIDER,
        alertThreshold: 5,
        circuitBreakerEnabled: false,
        quality: {
          allowQualityDegradation: false,
          minimumQualityThreshold: 8.0
        }
      }],
      
      [ErrorCategory.RATE_LIMIT, {
        category: ErrorCategory.RATE_LIMIT,
        maxRetries: 2,
        backoffStrategy: BackoffStrategy.LINEAR,
        baseDelayMs: 60000, // 1 minute
        maxDelayMs: 300000, // 5 minutes
        fallbackAction: FallbackAction.SWITCH_PROVIDER,
        alertThreshold: 3,
        circuitBreakerEnabled: true,
        quality: {
          allowQualityDegradation: true,
          minimumQualityThreshold: 7.0
        }
      }],
      
      [ErrorCategory.API_FAILURE, {
        category: ErrorCategory.API_FAILURE,
        maxRetries: 2,
        backoffStrategy: BackoffStrategy.EXPONENTIAL,
        baseDelayMs: 2000,
        maxDelayMs: 20000,
        fallbackAction: FallbackAction.SWITCH_PROVIDER,
        alertThreshold: 2,
        circuitBreakerEnabled: true,
        quality: {
          allowQualityDegradation: true,
          minimumQualityThreshold: 7.5
        }
      }],
      
      [ErrorCategory.QUALITY_FAILURE, {
        category: ErrorCategory.QUALITY_FAILURE,
        maxRetries: 2,
        backoffStrategy: BackoffStrategy.FIXED,
        baseDelayMs: 5000,
        maxDelayMs: 15000,
        fallbackAction: FallbackAction.SWITCH_PROVIDER,
        alertThreshold: 1,
        circuitBreakerEnabled: false,
        quality: {
          allowQualityDegradation: false,
          minimumQualityThreshold: 8.5
        }
      }],
      
      [ErrorCategory.TIMEOUT, {
        category: ErrorCategory.TIMEOUT,
        maxRetries: 1,
        backoffStrategy: BackoffStrategy.FIXED,
        baseDelayMs: 3000,
        maxDelayMs: 10000,
        fallbackAction: FallbackAction.SWITCH_PROVIDER,
        alertThreshold: 2,
        circuitBreakerEnabled: true,
        quality: {
          allowQualityDegradation: true,
          minimumQualityThreshold: 7.0
        }
      }],
      
      [ErrorCategory.AUTHENTICATION, {
        category: ErrorCategory.AUTHENTICATION,
        maxRetries: 1,
        backoffStrategy: BackoffStrategy.FIXED,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        fallbackAction: FallbackAction.SWITCH_PROVIDER,
        alertThreshold: 1,
        circuitBreakerEnabled: true,
        quality: {
          allowQualityDegradation: true,
          minimumQualityThreshold: 7.0
        }
      }],
      
      [ErrorCategory.PROVIDER_OVERLOAD, {
        category: ErrorCategory.PROVIDER_OVERLOAD,
        maxRetries: 0,
        backoffStrategy: BackoffStrategy.FIXED,
        baseDelayMs: 0,
        maxDelayMs: 0,
        fallbackAction: FallbackAction.SWITCH_PROVIDER,
        alertThreshold: 1,
        circuitBreakerEnabled: true,
        quality: {
          allowQualityDegradation: true,
          minimumQualityThreshold: 6.5
        }
      }],
      
      [ErrorCategory.SYSTEM_ERROR, {
        category: ErrorCategory.SYSTEM_ERROR,
        maxRetries: 1,
        backoffStrategy: BackoffStrategy.EXPONENTIAL,
        baseDelayMs: 5000,
        maxDelayMs: 30000,
        fallbackAction: FallbackAction.GRACEFUL_DEGRADATION,
        alertThreshold: 1,
        circuitBreakerEnabled: false,
        quality: {
          allowQualityDegradation: true,
          minimumQualityThreshold: 6.0
        }
      }]
    ]);
  }

  /**
   * Handle provider error with intelligent recovery
    */
  async handleError(
    error: VideoProviderError,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    const startTime = Date.now();

    try {
      // Record error
      const errorRecord = this.createErrorRecord(error, context);
      context.previousErrors.push(errorRecord);

      // Classify error and get recovery strategy
      const category = this.classifyError(error);
      const strategy = this.recoveryStrategies.get(category);

      if (!strategy) {
        throw new VideoProviderError(
          VideoProviderErrorType.PROCESSING_ERROR,
          `No recovery strategy for error category: ${category}`
        );
      }

      // Check circuit breaker
      if (strategy.circuitBreakerEnabled && this.circuitBreaker.isOpen(context.providerId)) {
        return await this.executeProviderSwitch(context);
      }

      // Execute recovery strategy
      const result = await this.executeRecoveryStrategy(strategy, context);
      
      // Log recovery result
      await this.logRecoveryResult(context, result, category);
      
      return result;

    } catch (recoveryError: any) {
      
      return {
        success: false,
        action: FallbackAction.FAIL_FAST,
        attemptsUsed: context.attempt,
        totalRecoveryTime: Date.now() - startTime,
        errorHistory: context.previousErrors,
        finalError: recoveryError instanceof VideoProviderError ? 
          recoveryError : 
                      new VideoProviderError(
              VideoProviderErrorType.PROCESSING_ERROR,
              `Recovery failed: ${recoveryError.message}`
            )
      };
    }
  }

  private classifyError(error: VideoProviderError): ErrorCategory {
    switch (error.type) {
      case VideoProviderErrorType.RATE_LIMIT_EXCEEDED:
        return ErrorCategory.RATE_LIMIT;
      
      case VideoProviderErrorType.TIMEOUT_ERROR:
        return ErrorCategory.TIMEOUT;
      
      case VideoProviderErrorType.AUTHENTICATION_ERROR:
      case VideoProviderErrorType.INSUFFICIENT_CREDITS:
        return ErrorCategory.AUTHENTICATION;
      
      case VideoProviderErrorType.NETWORK_ERROR:
        return ErrorCategory.NETWORK_ERROR;
      
      case VideoProviderErrorType.QUOTA_EXCEEDED:
        return ErrorCategory.QUOTA_EXCEEDED;
      
      case VideoProviderErrorType.PROVIDER_UNAVAILABLE:
        return ErrorCategory.PROVIDER_OVERLOAD;
      
      case VideoProviderErrorType.PROCESSING_ERROR:
        return ErrorCategory.PROCESSING_ERROR;
      
      case VideoProviderErrorType.INVALID_PARAMETERS:
      case VideoProviderErrorType.UNSUPPORTED_FEATURE:
        return ErrorCategory.API_FAILURE;
      
      default:
        return ErrorCategory.SYSTEM_ERROR;
    }
  }

  private async executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    
    switch (strategy.fallbackAction) {
      case FallbackAction.RETRY_SAME_PROVIDER:
        return await this.retryWithSameProvider(strategy, context);
      
      case FallbackAction.SWITCH_PROVIDER:
        return await this.executeProviderSwitch(context);
      
      case FallbackAction.GRACEFUL_DEGRADATION:
        return await this.executeGracefulDegradation(strategy, context);
      
      case FallbackAction.QUEUE_FOR_LATER:
        return await this.queueForLater(context);
      
      case FallbackAction.FAIL_FAST:
      default:
        return {
          success: false,
          action: FallbackAction.FAIL_FAST,
          attemptsUsed: context.attempt,
          totalRecoveryTime: Date.now() - startTime,
          errorHistory: context.previousErrors,
          finalError: new VideoProviderError(
            VideoProviderErrorType.PROCESSING_ERROR,
            'All recovery strategies exhausted'
          )
        };
    }
  }

  private async retryWithSameProvider(
    strategy: RecoveryStrategy,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    
    if (context.attempt >= strategy.maxRetries) {
      return await this.executeProviderSwitch(context);
    }

    // Calculate backoff delay
    const delay = BackoffCalculator.calculateDelay(
      strategy.backoffStrategy,
      context.attempt,
      strategy.baseDelayMs,
      strategy.maxDelayMs
    );

    
    // Wait for backoff
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // Get provider and retry
      const provider = this.providerSelectionEngine.getProvider(context.providerId);
      if (!provider) {
                  throw new VideoProviderError(
            VideoProviderErrorType.PROVIDER_UNAVAILABLE,
            `Provider ${context.providerId} not available`
          );
      }

      // Adjust options for retry if needed
      const adjustedOptions = this.adjustOptionsForRetry(context.options, strategy);
      
      if (!provider.generateVideo) {
        throw new Error('Provider does not support video generation');
      }
      const result = await provider.generateVideo(adjustedOptions);
      
      return {
        success: true,
        result,
        action: FallbackAction.RETRY_SAME_PROVIDER,
        newProviderId: context.providerId,
        attemptsUsed: context.attempt + 1,
        totalRecoveryTime: Date.now() - startTime,
        errorHistory: context.previousErrors
      };

    } catch (retryError: any) {
      // Update context for next attempt
      context.attempt++;
      const errorRecord = this.createErrorRecord(retryError, context);
      context.previousErrors.push(errorRecord);

      // Check circuit breaker after retry failure
      if (strategy.circuitBreakerEnabled) {
        this.circuitBreaker.recordFailure(context.providerId);
      }

      // If still retryable, try again
      if (context.attempt < strategy.maxRetries && retryError.retryable) {
        return await this.retryWithSameProvider(strategy, context);
      }

      // Switch to different provider
      return await this.executeProviderSwitch(context);
    }
  }

  private async executeProviderSwitch(context: RecoveryContext): Promise<RecoveryResult> {
    const startTime = Date.now();
    
    try {
      
      // Update selection criteria to exclude failed providers
      const updatedCriteria = {
        requirements: context.originalCriteria?.requirements || { duration: 'medium' },
        preferences: context.originalCriteria?.preferences,
        context: {
          ...context.originalCriteria?.context,
          isRetry: true,
          previousFailures: [...(context.originalCriteria?.context?.previousFailures || []), context.providerId]
        }
      };

      // Select new provider
      const selection = await this.providerSelectionEngine.selectOptimalProvider(updatedCriteria);
      const newProvider = selection.selectedProvider;


      // Adjust options for new provider if needed
      const adjustedOptions = this.adjustOptionsForProvider(context.options, newProvider);
      
      // Generate video with new provider
      if (!newProvider.generateVideo) {
        throw new Error('New provider does not support video generation');
      }
      const result = await newProvider.generateVideo(adjustedOptions);
      
      return {
        success: true,
        result,
        action: FallbackAction.SWITCH_PROVIDER,
        newProviderId: newProvider.name,
        attemptsUsed: context.attempt + 1,
        totalRecoveryTime: Date.now() - startTime,
        errorHistory: context.previousErrors
      };

    } catch (switchError: any) {
      
      // Try graceful degradation as last resort
      return await this.executeGracefulDegradation(
        this.recoveryStrategies.get(ErrorCategory.SYSTEM_ERROR)!,
        context
      );
    }
  }

  private async executeGracefulDegradation(
    strategy: RecoveryStrategy,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    
    try {
      
      // Try to find any available provider with lower quality requirements
      const providers = this.providerSelectionEngine.getAllProviders();
      const degradedOptions = this.getDegradedOptions(context.options, strategy);
      
      for (const provider of providers) {
        if (!provider.generateVideo) {
          continue;
        }
        try {
          const result = await provider.generateVideo(degradedOptions);
          
          return {
            success: true,
            result,
            action: FallbackAction.GRACEFUL_DEGRADATION,
            newProviderId: provider.name,
            attemptsUsed: context.attempt + 1,
            totalRecoveryTime: Date.now() - startTime,
            errorHistory: context.previousErrors
          };
          
        } catch (degradedError) {
          continue;
        }
      }
      
      // If all providers fail, return failure
      return {
        success: false,
        action: FallbackAction.GRACEFUL_DEGRADATION,
        attemptsUsed: context.attempt + 1,
        totalRecoveryTime: Date.now() - startTime,
        errorHistory: context.previousErrors,
        finalError: new VideoProviderError(
                      VideoProviderErrorType.PROVIDER_UNAVAILABLE,
            'All providers failed, even with degraded quality'
        )
      };

    } catch (error: any) {
      return {
        success: false,
        action: FallbackAction.GRACEFUL_DEGRADATION,
        attemptsUsed: context.attempt + 1,
        totalRecoveryTime: Date.now() - startTime,
        errorHistory: context.previousErrors,
        finalError: error
      };
    }
  }

  private async queueForLater(context: RecoveryContext): Promise<RecoveryResult> {
    const startTime = Date.now();
    
    try {
      // Store job for later processing
      await this.db.collection('queued_video_jobs').doc(context.jobId).set({
        jobId: context.jobId,
        script: context.script,
        options: context.options,
        originalCriteria: context.originalCriteria,
        queuedAt: admin.firestore.FieldValue.serverTimestamp(),
        priority: context.userTier === 'enterprise' ? 'high' : 'normal',
        retryAfter: new Date(Date.now() + 300000) // 5 minutes
      });

      return {
        success: false, // Not immediately successful
        action: FallbackAction.QUEUE_FOR_LATER,
        attemptsUsed: context.attempt + 1,
        totalRecoveryTime: Date.now() - startTime,
        errorHistory: context.previousErrors
      };

    } catch (error: any) {
      return {
        success: false,
        action: FallbackAction.FAIL_FAST,
        attemptsUsed: context.attempt + 1,
        totalRecoveryTime: Date.now() - startTime,
        errorHistory: context.previousErrors,
        finalError: error
      };
    }
  }

  private createErrorRecord(error: any, context: RecoveryContext): ErrorRecord {
    return {
      timestamp: new Date(),
      providerId: context.providerId,
      category: this.classifyError(error),
      errorType: error.type || VideoProviderErrorType.PROCESSING_ERROR,
      message: error.message,
      retryable: error.retryable || false,
      recoveryAction: FallbackAction.RETRY_SAME_PROVIDER // Will be updated based on strategy
    };
  }

  private adjustOptionsForRetry(
    options: VideoGenerationOptions,
    strategy: RecoveryStrategy
  ): VideoGenerationOptions {
    const adjustedOptions = { ...options };
    
    // Allow quality degradation if strategy permits
    if (strategy.quality.allowQualityDegradation) {
      // Reduce duration for faster processing
      if (typeof adjustedOptions.duration === 'string') {
        if (adjustedOptions.duration === 'long') {
          adjustedOptions.duration = 60;
        } else if (adjustedOptions.duration === 'medium') {
          adjustedOptions.duration = 30;
        }
      }
      
      // Use simpler avatar style
      if (adjustedOptions.avatarStyle === 'realistic') {
        adjustedOptions.avatarStyle = 'corporate';
      }
    }
    
    return adjustedOptions;
  }

  private adjustOptionsForProvider(
    options: VideoGenerationOptions,
    provider: VideoGenerationProvider
  ): VideoGenerationOptions {
    const adjustedOptions = { ...options };
    
    // Adjust options based on provider capabilities
    if (!provider.capabilities?.voiceCloning) {
      delete adjustedOptions.customVoiceId;
    }
    
    if (!provider.capabilities?.customAvatars) {
      delete adjustedOptions.customAvatarId;
    }
    
    if (!provider.capabilities?.emotionControl) {
      delete adjustedOptions.emotion;
    }
    
    if (!provider.capabilities?.voiceSpeedControl) {
      delete adjustedOptions.voiceSpeed;
    }
    
    return adjustedOptions;
  }

  private getDegradedOptions(
    options: VideoGenerationOptions,
    _strategy: RecoveryStrategy
  ): VideoGenerationOptions {
    const degradedOptions = { ...options };
    
    // Apply maximum degradation for guaranteed success
    degradedOptions.duration = 'short';
    degradedOptions.style = 'professional';
    degradedOptions.avatarStyle = 'corporate';
    degradedOptions.background = 'modern';
    degradedOptions.includeSubtitles = false;
    
    // Remove advanced features
    delete degradedOptions.customAvatarId;
    delete degradedOptions.customVoiceId;
    delete degradedOptions.emotion;
    delete degradedOptions.voiceSpeed;
    
    return degradedOptions;
  }

  private async logRecoveryResult(
    context: RecoveryContext,
    result: RecoveryResult,
    errorCategory: ErrorCategory
  ): Promise<void> {
    try {
      const logData = {
        jobId: context.jobId,
        originalProvider: context.providerId,
        finalProvider: result.newProviderId,
        errorCategory,
        recoveryAction: result.action,
        success: result.success,
        attemptsUsed: result.attemptsUsed,
        totalRecoveryTime: result.totalRecoveryTime,
        errorHistory: result.errorHistory.map(e => ({
          timestamp: e.timestamp,
          providerId: e.providerId,
          category: e.category,
          errorType: e.errorType,
          message: e.message.substring(0, 500) // Truncate long messages
        })),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection('error_recovery_logs').add(logData);
      
    } catch (error) {
      // Non-critical error, don't throw
    }
  }

  /**
   * Create recovery context for a failed operation
    */
  createRecoveryContext(
    jobId: string,
    providerId: string,
    script: string,
    options: VideoGenerationOptions,
    originalCriteria: ProviderSelectionCriteria
  ): RecoveryContext {
    return {
      jobId,
      providerId,
      script,
      options,
      originalCriteria,
      attempt: 0,
      startTime: new Date(),
      previousErrors: [],
      userTier: originalCriteria.context.userTier
    };
  }

  /**
   * Get recovery statistics
    */
  async getRecoveryStatistics(period: '24h' | '7d' | '30d' = '24h'): Promise<any> {
    try {
      const cutoffDate = new Date();
      const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      const snapshot = await this.db.collection('error_recovery_logs')
        .where('timestamp', '>=', cutoffDate)
        .get();

      const logs = snapshot.docs.map(doc => doc.data());
      
      const stats = {
        totalRecoveries: logs.length,
        successfulRecoveries: logs.filter(log => log.success).length,
        recoveryActions: {},
        errorCategories: {},
        averageRecoveryTime: 0,
        providerSwitches: logs.filter(log => log.originalProvider !== log.finalProvider).length
      };

      // Calculate recovery action distribution
      logs.forEach(log => {
        (stats.recoveryActions as Record<string, number>)[log.recoveryAction] = ((stats.recoveryActions as Record<string, number>)[log.recoveryAction] || 0) + 1;
        (stats.errorCategories as Record<string, number>)[log.errorCategory] = ((stats.errorCategories as Record<string, number>)[log.errorCategory] || 0) + 1;
      });

      // Calculate average recovery time
      if (logs.length > 0) {
        stats.averageRecoveryTime = logs.reduce((sum, log) => sum + (log.totalRecoveryTime || 0), 0) / logs.length;
      }

      return {
        period,
        ...stats,
        successRate: logs.length > 0 ? (stats.successfulRecoveries / logs.length * 100).toFixed(1) : 0,
        generatedAt: new Date()
      };

    } catch (error) {
      throw error;
    }
  }
}

// Export for use in enhanced video service
// ErrorRecoveryEngine is already exported as a class above