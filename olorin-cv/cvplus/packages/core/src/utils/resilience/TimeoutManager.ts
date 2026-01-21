import { logger } from 'firebase-functions';

/**
 * Timeout manager with configurable timeouts
 * Extracted from CircuitBreaker.ts to comply with 200-line rule
  */
export class TimeoutManager {
  /**
   * Wraps a function with a timeout
    */
  static withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage?: string
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  /**
   * Creates a timeout promise that rejects after specified time
    */
  static createTimeout(timeoutMs: number, message?: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(message || `Timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Wraps multiple functions with the same timeout
    */
  static withTimeoutMultiple<T>(
    functions: (() => Promise<T>)[],
    timeoutMs: number,
    timeoutMessage?: string
  ): Promise<T[]> {
    const wrappedFunctions = functions.map(fn => 
      this.withTimeout(fn, timeoutMs, timeoutMessage)
    );
    return Promise.all(wrappedFunctions);
  }

  /**
   * Creates a timeout wrapper function
    */
  static createTimeoutWrapper<T>(
    timeoutMs: number,
    timeoutMessage?: string
  ): (fn: () => Promise<T>) => Promise<T> {
    return (fn: () => Promise<T>) => this.withTimeout(fn, timeoutMs, timeoutMessage);
  }

  /**
   * Executes with a dynamic timeout based on operation complexity
    */
  static withDynamicTimeout<T>(
    fn: () => Promise<T>,
    baseTimeoutMs: number,
    complexityFactor: number = 1,
    maxTimeoutMs: number = 300000 // 5 minutes max
  ): Promise<T> {
    const dynamicTimeout = Math.min(baseTimeoutMs * complexityFactor, maxTimeoutMs);
    logger.info(`🕰️ Dynamic timeout set to ${dynamicTimeout}ms (complexity factor: ${complexityFactor})`);
    return this.withTimeout(fn, dynamicTimeout, `Dynamic timeout after ${dynamicTimeout}ms`);
  }

  /**
   * Executes with escalating timeouts on retry
    */
  static withEscalatingTimeout<T>(
    fn: () => Promise<T>,
    initialTimeoutMs: number,
    maxAttempts: number = 3,
    timeoutMultiplier: number = 1.5
  ): Promise<T> {
    let attempt = 1;
    let currentTimeout = initialTimeoutMs;

    const attemptWithTimeout = async (): Promise<T> => {
      try {
        logger.info(`🕰️ Attempt ${attempt} with ${currentTimeout}ms timeout`);
        return await this.withTimeout(fn, currentTimeout, `Attempt ${attempt} timed out after ${currentTimeout}ms`);
      } catch (error: any) {
        if (attempt >= maxAttempts) {
          throw error;
        }

        if (error.message.includes('timed out')) {
          attempt++;
          currentTimeout = Math.round(currentTimeout * timeoutMultiplier);
          logger.info(`⚠️ Timeout on attempt ${attempt - 1}, escalating to ${currentTimeout}ms`);
          return attemptWithTimeout();
        }

        throw error; // Non-timeout errors are not retried
      }
    };

    return attemptWithTimeout();
  }

  /**
   * Creates a timeout with cleanup callback
    */
  static withTimeoutAndCleanup<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    cleanup: () => void,
    timeoutMessage?: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([
      fn().finally(() => clearTimeout(timeoutId)),
      timeoutPromise
    ]);
  }
}