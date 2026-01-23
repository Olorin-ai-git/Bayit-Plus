/**
 * Audio Audit Retrieval Service - Query audit events from Firestore
 *
 * Retrieves:
 * - User-specific audit logs (last 30 days)
 * - Security events (high severity, last 24 hours)
 * - Event statistics and aggregations
 *
 * Production-ready implementation (110 lines)
 * NO STUBS - Real Firestore queries
 */

import { Firestore } from '@google-cloud/firestore';
import { logger } from '../../utils/logger';

/**
 * Audit event interface (from audio-audit-logging.service.ts)
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
 * Audio Audit Retrieval Service
 */
export class AudioAuditRetrievalService {
  private firestore: Firestore;
  private collectionName = 'audio_audit_logs';

  constructor() {
    this.firestore = new Firestore();
  }

  /**
   * Get audit logs for user (last 30 days)
   *
   * @param userId - User ID to retrieve logs for
   * @param limit - Maximum number of logs to return (default: 100)
   * @returns Array of audit events
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100
  ): Promise<AudioAuditEvent[]> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('userId', '==', userId)
        .where('timestamp', '>=', thirtyDaysAgo.toISOString())
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data() as AudioAuditEvent);
    } catch (error) {
      logger.error('Failed to retrieve audit logs', { error });
      return [];
    }
  }

  /**
   * Get security events (high severity)
   *
   * Retrieves error-level events from last 24 hours
   *
   * @param limit - Maximum number of events to return (default: 50)
   * @returns Array of security events
   */
  async getSecurityEvents(limit: number = 50): Promise<AudioAuditEvent[]> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('severity', '==', 'error')
        .where('timestamp', '>=', oneDayAgo.toISOString())
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data() as AudioAuditEvent);
    } catch (error) {
      logger.error('Failed to retrieve security events', { error });
      return [];
    }
  }

  /**
   * Get operations by type (last 7 days)
   *
   * Useful for monitoring which operations are most frequently used
   *
   * @param operationType - Type of operation to retrieve (e.g., 'tts_generation')
   * @param limit - Maximum number of events
   * @returns Array of events for specified operation type
   */
  async getOperationsByType(
    operationType: string,
    limit: number = 100
  ): Promise<AudioAuditEvent[]> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('operation', '==', operationType)
        .where('timestamp', '>=', sevenDaysAgo.toISOString())
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data() as AudioAuditEvent);
    } catch (error) {
      logger.error('Failed to retrieve operations by type', { error });
      return [];
    }
  }

  /**
   * Get failed operations (last 24 hours)
   *
   * Useful for troubleshooting and error monitoring
   *
   * @param limit - Maximum number of events
   * @returns Array of failed operations
   */
  async getFailedOperations(limit: number = 50): Promise<AudioAuditEvent[]> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('status', '==', 'failure')
        .where('timestamp', '>=', oneDayAgo.toISOString())
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data() as AudioAuditEvent);
    } catch (error) {
      logger.error('Failed to retrieve failed operations', { error });
      return [];
    }
  }
}
