/**
 * Audio Security Service - Rate limiting & content validation
 *
 * v7.0 Refactoring:
 * - Rate limiting focused (moved from 389 to <200 lines)
 * - Content validation
 * - Encryption moved to audio-encryption.service.ts
 * - Audit logging moved to audio-audit.service.ts
 * - Signed URLs moved to audio-processing.service.ts
 *
 * NO STUBS - Production-ready security checks
 */

import { logger } from '../../utils/logger';
import { AudioRateLimitInfo } from '../../types/audio';
import { getConfig } from '../../config/audio.config';

/**
 * Rate Limiter for Audio Operations
 *
 * Multi-tier rate limiting:
 * - Per-User: Configurable limits (10/hour, 100/day)
 * - Hourly and daily windows
 * - Burst protection: Concurrent request tracking
 */
export class AudioRateLimiter {
  private requestCounts: Map<string, { count: number; resetAt: number }> =
    new Map();
  private concurrentRequests: Map<string, number> = new Map();
  private config: ReturnType<typeof getConfig>;

  constructor() {
    this.config = getConfig();
  }

  /**
   * Check if user has exceeded rate limits
   */
  async checkRateLimit(userId: string): Promise<AudioRateLimitInfo> {
    const now = Date.now();
    const hourly = this.getOrCreateCounter(`hourly:${userId}`, now, 3600000);
    const daily = this.getOrCreateCounter(`daily:${userId}`, now, 86400000);
    const concurrent = this.concurrentRequests.get(userId) || 0;

    const exceeded =
      hourly.count >= this.config.audioRateLimitPerHour ||
      daily.count >= this.config.audioRateLimitPerDay ||
      concurrent > 5; // Max 5 concurrent

    return {
      userId,
      hourlyCount: hourly.count,
      hourlyLimit: this.config.audioRateLimitPerHour,
      dailyCount: daily.count,
      dailyLimit: this.config.audioRateLimitPerDay,
      resetAt: new Date(hourly.resetAt),
      exceeded,
    };
  }

  /**
   * Increment rate limit counter
   */
  async incrementCounter(userId: string): Promise<void> {
    const now = Date.now();
    const hourly = this.getOrCreateCounter(`hourly:${userId}`, now, 3600000);
    const daily = this.getOrCreateCounter(`daily:${userId}`, now, 86400000);

    hourly.count++;
    daily.count++;

    this.concurrentRequests.set(userId, (this.concurrentRequests.get(userId) || 0) + 1);

    logger.debug('Rate limit counter incremented', {
      userId,
      hourlyCount: hourly.count,
      dailyCount: daily.count,
    });
  }

  /**
   * Decrement concurrent request count
   */
  async decrementConcurrent(userId: string): Promise<void> {
    const current = this.concurrentRequests.get(userId) || 0;
    if (current > 0) {
      this.concurrentRequests.set(userId, current - 1);
    }
  }

  /**
   * Get or create rate limit counter
   */
  private getOrCreateCounter(
    key: string,
    now: number,
    windowMs: number
  ): { count: number; resetAt: number } {
    let counter = this.requestCounts.get(key);

    if (!counter || now >= counter.resetAt) {
      counter = {
        count: 0,
        resetAt: now + windowMs,
      };
      this.requestCounts.set(key, counter);
    }

    return counter;
  }
}

/**
 * Content Validator for Audio Operations
 *
 * Validates:
 * - File size within limits
 * - Audio format is supported
 * - Text content for TTS (no abuse patterns)
 */
export class AudioContentValidator {
  private config: ReturnType<typeof getConfig>;
  private readonly ABUSE_PATTERNS = [
    /\b(spam|scam|phish|hack|exploit)\b/i,
    /\b(viagra|cialis|casino|lottery)\b/i,
    /\b(malware|ransomware|trojan)\b/i,
  ];

  constructor() {
    this.config = getConfig();
  }

  /**
   * Validate TTS text input
   */
  validateTTSText(text: string): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: 'Text is empty' };
    }

    if (text.length > this.config.maxTextLength) {
      return {
        valid: false,
        error: `Text exceeds maximum of ${this.config.maxTextLength} characters`,
      };
    }

    for (const pattern of this.ABUSE_PATTERNS) {
      if (pattern.test(text)) {
        logger.warn('Abuse pattern detected', { pattern: pattern.source });
        return { valid: false, error: 'Text contains prohibited content' };
      }
    }

    return { valid: true };
  }

  /**
   * Validate audio file upload
   */
  validateAudioFile(
    file: Buffer,
    contentType: string
  ): { valid: boolean; error?: string } {
    if (!file || file.length === 0) {
      return { valid: false, error: 'File is empty' };
    }

    if (file.length > this.config.maxAudioSize) {
      return {
        valid: false,
        error: `File exceeds maximum size of ${this.config.maxAudioSize} bytes`,
      };
    }

    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/flac',
      'audio/webm',
      'audio/opus',
    ];

    if (!allowedTypes.includes(contentType)) {
      return { valid: false, error: `Unsupported type: ${contentType}` };
    }

    return { valid: true };
  }
}
