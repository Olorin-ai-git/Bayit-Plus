/**
 * Base Service - Stub implementation for Core module
 * Note: These CV services should be moved to cv-processing module
 * Core module should not contain domain-specific services
  */

import { logger } from 'firebase-functions';

export abstract class BaseService {
  protected logger = logger;

  protected async initialize(): Promise<void> {
    // Base initialization
  }

  protected async cleanup(): Promise<void> {
    // Base cleanup
  }

  protected async healthCheck(): Promise<boolean> {
    return true;
  }

  protected async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string = 'Operation timed out'
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    );
    return Promise.race([promise, timeout]);
  }
}