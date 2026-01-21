/**
 * Wizard State Service Retry Logic
 * Feature: 005-polling-and-persistence
 * Task: T020 - Retry with exponential backoff
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven delays and retries
 * - No hardcoded values
 * - Complete implementation
 */

import { getConfig } from '../config/env.config';
import { WizardStateError } from './wizardStateService.errors';

/**
 * Retry Manager for wizard state operations.
 */
export class RetryManager {
  private readonly config = getConfig();

  /**
   * Execute operation with retry logic and exponential backoff.
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const maxRetries = this.config.polling.maxRetries;

      if (attempt >= maxRetries) {
        throw error;
      }

      if (this.shouldRetry(error)) {
        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);
        return this.withRetry(operation, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Determine if error should trigger retry.
   * Uses error's isRetryable() method for type-safe retry decisions.
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof WizardStateError) {
      return error.isRetryable();
    }
    return false;
  }

  /**
   * Calculate exponential backoff delay.
   */
  private calculateBackoff(attempt: number): number {
    const baseDelay = this.config.polling.baseInterval;
    const multiplier = this.config.polling.backoffMultiplier;
    const maxBackoff = this.config.polling.maxBackoff;

    const delay = baseDelay * Math.pow(multiplier, attempt);
    return Math.min(delay, maxBackoff);
  }

  /**
   * Sleep utility for retry delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
