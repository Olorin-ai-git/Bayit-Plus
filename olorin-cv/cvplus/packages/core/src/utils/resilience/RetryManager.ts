import { logger } from 'firebase-functions';

/**
 * Retry mechanism with exponential backoff
 * Extracted from CircuitBreaker.ts to comply with 200-line rule
  */
export class RetryManager {
  /**
   * Executes a function with retry logic and exponential backoff
    */
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000,
    backoffFactor: number = 2
  ): Promise<T> {
    let attempt = 1;
    let delay = baseDelay;

    while (attempt <= maxAttempts) {
      try {
        logger.info(`🔄 Attempt ${attempt}/${maxAttempts}`);
        return await fn();
      } catch (error: any) {
        if (attempt === maxAttempts) {
          logger.error(`❌ All ${maxAttempts} attempts failed`);
          throw error;
        }

        logger.warn(`⚠️ Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms`);
        await this.sleep(delay);
        
        delay = Math.min(delay * backoffFactor, maxDelay);
        attempt++;
      }
    }
    
    throw new Error('Retry logic error - should not reach here');
  }

  /**
   * Sleep utility function
    */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executes with retry and circuit breaker protection
    */
  static async withRetryAndCircuitBreaker<T>(
    fn: () => Promise<T>,
    circuitBreaker: any,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    return circuitBreaker.execute(
      async () => {
        return this.withRetry(fn, maxAttempts, baseDelay);
      }
    );
  }

  /**
   * Creates a retryable function with predefined settings
    */
  static createRetryableFunction<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): () => Promise<T> {
    return () => this.withRetry(fn, maxAttempts, baseDelay);
  }

  /**
   * Retries with jitter to avoid thundering herd
    */
  static async withJitteredRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000
  ): Promise<T> {
    let attempt = 1;

    while (attempt <= maxAttempts) {
      try {
        return await fn();
      } catch (error: any) {
        if (attempt === maxAttempts) {
          throw error;
        }

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.5 + 0.75; // 75-125% of base delay
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) * jitter, maxDelay);
        
        logger.warn(`⚠️ Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms`);
        await this.sleep(delay);
        attempt++;
      }
    }
    
    throw new Error('Jittered retry logic error');
  }
}