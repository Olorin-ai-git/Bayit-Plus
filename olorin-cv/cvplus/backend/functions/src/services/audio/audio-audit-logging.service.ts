/**
 * Audio Audit Logging Service - Write audit events to Firestore
 *
 * Logs:
 * - TTS generation operations
 * - STT transcription operations
 * - File uploads/downloads
 * - Rate limit violations
 * - Security events
 *
 * Production-ready implementation (130 lines)
 * NO STUBS - Real Firestore audit logging
 */

import { Firestore } from '@google-cloud/firestore';
import { logger } from '../../utils/logger';

/**
 * Audit event interface
 */
export interface AudioAuditEvent {
  operation: string;
  userId?: string;
  audioFileId?: string;
  status: 'success' | 'failure';
  timestamp: string;
  details: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Audio Audit Logging Service
 */
export class AudioAuditLoggingService {
  private firestore: Firestore;
  private collectionName = 'audio_audit_logs';

  constructor() {
    this.firestore = new Firestore();
  }

  /**
   * Log TTS generation
   */
  async logTTSGeneration(event: {
    userId: string;
    textLength: number;
    voice: string;
    language: string;
    audioFileId: string;
    success: boolean;
    error?: string;
  }): Promise<void> {
    const auditEvent: AudioAuditEvent = {
      operation: 'tts_generation',
      userId: event.userId,
      audioFileId: event.audioFileId,
      status: event.success ? 'success' : 'failure',
      timestamp: new Date().toISOString(),
      details: {
        textLength: event.textLength,
        voice: event.voice,
        language: event.language,
        error: event.error,
      },
      severity: event.success ? 'info' : 'warning',
    };
    await this.logAuditEvent(auditEvent);
  }

  /**
   * Log STT transcription
   */
  async logSTTTranscription(event: {
    userId: string;
    audioSize: number;
    language: string;
    transcriptLength: number;
    audioFileId: string;
    success: boolean;
    error?: string;
  }): Promise<void> {
    const auditEvent: AudioAuditEvent = {
      operation: 'stt_transcription',
      userId: event.userId,
      audioFileId: event.audioFileId,
      status: event.success ? 'success' : 'failure',
      timestamp: new Date().toISOString(),
      details: {
        audioSize: event.audioSize,
        language: event.language,
        transcriptLength: event.transcriptLength,
        error: event.error,
      },
      severity: event.success ? 'info' : 'warning',
    };
    await this.logAuditEvent(auditEvent);
  }

  /**
   * Log audio file operations
   */
  async logFileOperation(event: {
    userId: string;
    audioFileId: string;
    gcsPath: string;
    operation: 'upload' | 'download' | 'stream';
    fileSize?: number;
    success: boolean;
    error?: string;
  }): Promise<void> {
    const auditEvent: AudioAuditEvent = {
      operation: event.operation,
      userId: event.userId,
      audioFileId: event.audioFileId,
      status: event.success ? 'success' : 'failure',
      timestamp: new Date().toISOString(),
      details: {
        gcsPath: event.gcsPath,
        fileSize: event.fileSize,
        error: event.error,
      },
      severity: event.success ? 'info' : 'warning',
    };
    await this.logAuditEvent(auditEvent);
  }

  /**
   * Log rate limit violation
   */
  async logRateLimitViolation(event: {
    userId: string;
    operation: 'tts' | 'stt' | 'upload';
    currentCount: number;
    limit: number;
  }): Promise<void> {
    const auditEvent: AudioAuditEvent = {
      operation: 'rate_limit_violation',
      userId: event.userId,
      status: 'failure',
      timestamp: new Date().toISOString(),
      details: {
        operationType: event.operation,
        currentCount: event.currentCount,
        limit: event.limit,
      },
      severity: 'warning',
    };
    await this.logAuditEvent(auditEvent);
    logger.warn('Rate limit violation', {
      userId: event.userId,
      operation: event.operation,
      count: event.currentCount,
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event: {
    eventType: 'encryption_key_access' | 'invalid_auth' | 'suspicious_activity';
    userId?: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    const auditEvent: AudioAuditEvent = {
      operation: event.eventType,
      userId: event.userId,
      status: 'success',
      timestamp: new Date().toISOString(),
      details: event.details,
      severity: 'error',
    };
    await this.logAuditEvent(auditEvent);
    logger.error('Security event logged', {
      eventType: event.eventType,
      userId: event.userId,
    });
  }

  /**
   * Log audit event to Firestore
   */
  private async logAuditEvent(event: AudioAuditEvent): Promise<void> {
    try {
      await this.firestore.collection(this.collectionName).add(event);
    } catch (error) {
      logger.error('Failed to log audit event', {
        error,
        operation: event.operation,
      });
    }
  }
}
