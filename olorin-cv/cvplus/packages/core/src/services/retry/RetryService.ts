import { logger } from 'firebase-functions';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialFactor?: number;
  retryableErrors?: string[];
  timeout?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Error types that are retryable by default
 */
export enum RetryableErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TEMPORARY = 'TEMPORARY',
}

/**
 * Retry state for tracking
 */
interface RetryState {
  key: string;
  attempts: number;
  lastAttempt: Date;
  totalRetries: number;
  successCount: number;
  failureCount: number;
}

/**
 * Service for executing operations with retry logic and exponential backoff
 */
export class RetryService {
  private static instance: RetryService;
  private db: Firestore | null = null;
  private app: App | null = null;
  private retryStates: Map<string, RetryState> = new Map();
  private defaultOptions: Required<Omit<RetryOptions, 'onRetry'>> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    exponentialFactor: 2,
    retryableErrors: [
      'NETWORK',
      'TIMEOUT',
      'RATE_LIMIT',
      'SERVICE_UNAVAILABLE',
      'TEMPORARY',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
    ],
    timeout: 30000,
  };

  private constructor() {
    // Lazy initialization
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }

  /**
   * Initialize Firestore connection
   */
  private initializeFirestore(): void {
    if (this.db) return;

    try {
      if (getApps().length === 0) {
        this.app = initializeApp();
      } else {
        this.app = getApps()[0] || null;
      }
      if (this.app) {
        this.db = getFirestore(this.app);
      }
      logger.info('[RetryService] Firestore initialized');
    } catch (error) {
      logger.error('[RetryService] Failed to initialize Firestore:', error);
    }
  }

  /**
   * Execute function with retry logic
   */
  public async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    let lastError: Error | null = null;
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Add timeout wrapper
        const result = await this.executeWithTimeout(fn, config.timeout);

        // Record success
        await this.recordSuccess(operationId, attempt);

        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryable(lastError, config.retryableErrors)) {
          logger.info(`[RetryService] Error not retryable: ${lastError.message}`);
          await this.recordFailure(operationId, attempt, lastError, false);
          throw lastError;
        }

        // Check if we've exhausted retries
        if (attempt >= config.maxRetries) {
          logger.info(`[RetryService] Max retries (${config.maxRetries}) exhausted`);
          await this.recordFailure(operationId, attempt, lastError, true);
          throw new Error(
            `Operation failed after ${config.maxRetries} retries: ${lastError.message}`
          );
        }

        // Calculate backoff delay
        const delay = this.calculateBackoff(attempt, config.baseDelay, config.exponentialFactor, config.maxDelay);

        logger.info(
          `[RetryService] Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms. Error: ${lastError.message}`
        );

        // Call retry callback if provided
        if (options.onRetry) {
          options.onRetry(attempt + 1, lastError);
        }

        // Record retry attempt
        await this.recordRetryAttempt(operationId, attempt, lastError, delay);

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Operation failed with unknown error');
  }

  /**
   * Calculate exponential backoff delay
   */
  public calculateBackoff(
    attempt: number,
    baseDelay: number = 1000,
    exponentialFactor: number = 2,
    maxDelay: number = 30000
  ): number {
    const delay = baseDelay * Math.pow(exponentialFactor, attempt);
    const jitter = delay * 0.1 * Math.random(); // Add 0-10% jitter
    return Math.min(delay + jitter, maxDelay);
  }

  /**
   * Check if error is retryable
   */
  public isRetryable(error: Error, retryableErrors: string[] = this.defaultOptions.retryableErrors): boolean {
    const errorMessage = error.message.toUpperCase();
    const errorName = error.name.toUpperCase();
    const errorCode = (error as any).code?.toUpperCase() || '';

    return retryableErrors.some(
      (retryableError) =>
        errorMessage.includes(retryableError.toUpperCase()) ||
        errorName.includes(retryableError.toUpperCase()) ||
        errorCode.includes(retryableError.toUpperCase())
    );
  }

  /**
   * Get max retries for specific error type
   */
  public getMaxRetries(errorType: RetryableErrorType | string): number {
    const errorRetryMap: Record<string, number> = {
      [RetryableErrorType.NETWORK]: 5,
      [RetryableErrorType.TIMEOUT]: 3,
      [RetryableErrorType.RATE_LIMIT]: 10,
      [RetryableErrorType.SERVICE_UNAVAILABLE]: 5,
      [RetryableErrorType.TEMPORARY]: 3,
    };

    return errorRetryMap[errorType] || this.defaultOptions.maxRetries;
  }

  /**
   * Reset retry count for a specific key
   */
  public resetRetryCount(key: string): void {
    this.retryStates.delete(key);
    logger.info(`[RetryService] Reset retry state for key: ${key}`);
  }

  /**
   * Get retry state for a key
   */
  public getRetryState(key: string): RetryState | undefined {
    return this.retryStates.get(key);
  }

  /**
   * Get all retry statistics
   */
  public getRetryStatistics(): {
    totalOperations: number;
    totalRetries: number;
    successRate: number;
    averageRetries: number;
  } {
    let totalRetries = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;

    this.retryStates.forEach((state) => {
      totalRetries += state.totalRetries;
      totalSuccesses += state.successCount;
      totalFailures += state.failureCount;
    });

    const totalOperations = totalSuccesses + totalFailures;
    const successRate = totalOperations > 0 ? totalSuccesses / totalOperations : 0;
    const averageRetries = totalOperations > 0 ? totalRetries / totalOperations : 0;

    return {
      totalOperations,
      totalRetries,
      successRate,
      averageRetries,
    };
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timeout after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Record successful operation
   */
  private async recordSuccess(operationId: string, attempts: number): Promise<void> {
    try {
      this.initializeFirestore();

      if (this.db) {
        await this.db.collection('retry_logs').add({
          operationId,
          status: 'success',
          attempts: attempts + 1,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error('[RetryService] Failed to record success:', error);
    }
  }

  /**
   * Record failed operation
   */
  private async recordFailure(
    operationId: string,
    attempts: number,
    error: Error,
    exhausted: boolean
  ): Promise<void> {
    try {
      this.initializeFirestore();

      if (this.db) {
        await this.db.collection('retry_logs').add({
          operationId,
          status: 'failure',
          attempts: attempts + 1,
          error: error.message,
          errorStack: error.stack,
          exhausted,
          timestamp: new Date(),
        });
      }
    } catch (err) {
      logger.error('[RetryService] Failed to record failure:', err);
    }
  }

  /**
   * Record retry attempt
   */
  private async recordRetryAttempt(
    operationId: string,
    attempt: number,
    error: Error,
    delay: number
  ): Promise<void> {
    try {
      this.initializeFirestore();

      if (this.db) {
        await this.db.collection('retry_logs').add({
          operationId,
          status: 'retry',
          attempt: attempt + 1,
          error: error.message,
          delay,
          timestamp: new Date(),
        });
      }
    } catch (err) {
      logger.error('[RetryService] Failed to record retry attempt:', err);
    }
  }

  /**
   * Clear all retry states
   */
  public clearRetryStates(): void {
    this.retryStates.clear();
    logger.info('[RetryService] Cleared all retry states');
  }
}

// Export singleton instance
export const retryService = RetryService.getInstance();
