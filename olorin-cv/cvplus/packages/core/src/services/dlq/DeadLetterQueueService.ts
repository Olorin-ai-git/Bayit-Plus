import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { logger } from 'firebase-functions';

/**
 * Dead letter queue message status
 */
export enum DLQMessageStatus {
  PENDING = 'PENDING',
  RETRYING = 'RETRYING',
  FAILED = 'FAILED',
  RESOLVED = 'RESOLVED',
  EXPIRED = 'EXPIRED',
}

/**
 * Dead letter queue message
 */
export interface DLQMessage {
  id?: string;
  originalMessage: any;
  error: string;
  errorStack?: string;
  context: Record<string, any>;
  status: DLQMessageStatus;
  retryCount: number;
  maxRetries: number;
  firstFailedAt: Date;
  lastAttemptAt: Date;
  resolvedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * DLQ processing result
 */
export interface DLQProcessingResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ messageId: string; error: string }>;
}

/**
 * DLQ statistics
 */
export interface DLQStatistics {
  totalMessages: number;
  pendingMessages: number;
  retryingMessages: number;
  failedMessages: number;
  resolvedMessages: number;
  expiredMessages: number;
  oldestMessage?: Date;
  newestMessage?: Date;
  averageRetries: number;
}

/**
 * Service for managing dead-letter queue for failed events and operations
 */
export class DeadLetterQueueService {
  private static instance: DeadLetterQueueService;
  private db: Firestore | null = null;
  private app: App | null = null;
  private defaultMaxRetries = 3;
  private defaultExpirationDays = 30;
  private collectionName = 'dlq';

  private constructor() {
    // Lazy initialization
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DeadLetterQueueService {
    if (!DeadLetterQueueService.instance) {
      DeadLetterQueueService.instance = new DeadLetterQueueService();
    }
    return DeadLetterQueueService.instance;
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
      logger.info('[DeadLetterQueueService] Firestore initialized');
    } catch (error) {
      logger.error('[DeadLetterQueueService] Failed to initialize Firestore:', error);
    }
  }

  /**
   * Add failed message to dead letter queue
   */
  public async addToDeadLetterQueue(
    message: any,
    error: Error,
    context: Record<string, any> = {},
    maxRetries: number = this.defaultMaxRetries
  ): Promise<string> {
    try {
      this.initializeFirestore();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.defaultExpirationDays * 24 * 60 * 60 * 1000);

      const dlqMessage: Omit<DLQMessage, 'id'> = {
        originalMessage: message,
        error: error.message,
        errorStack: error.stack,
        context,
        status: DLQMessageStatus.PENDING,
        retryCount: 0,
        maxRetries,
        firstFailedAt: now,
        lastAttemptAt: now,
        expiresAt,
        metadata: {
          errorName: error.name,
          addedAt: now,
        },
      };

      const docRef = await this.db.collection(this.collectionName).add(dlqMessage);

      logger.info(`[DLQ] Added message to queue: ${docRef.id}`);
      await this.logDLQEvent(docRef.id, 'message_added', { error: error.message });

      return docRef.id;
    } catch (err) {
      logger.error('[DLQ] Failed to add message to queue:', err);
      throw err;
    }
  }

  /**
   * Process pending messages in dead letter queue
   */
  public async processDeadLetterQueue(
    batchSize: number = 10,
    processor?: (message: DLQMessage) => Promise<void>
  ): Promise<DLQProcessingResult> {
    try {
      this.initializeFirestore();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const result: DLQProcessingResult = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        errors: [],
      };

      // Query pending and retrying messages
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('status', 'in', [DLQMessageStatus.PENDING, DLQMessageStatus.RETRYING])
        .orderBy('firstFailedAt', 'asc')
        .limit(batchSize)
        .get();

      logger.info(`[DLQ] Processing ${snapshot.size} messages from queue`);

      for (const doc of snapshot.docs) {
        const message = { id: doc.id, ...doc.data() } as DLQMessage;
        result.processed++;

        // Check if message has expired
        if (message.expiresAt && new Date() > message.expiresAt) {
          await this.expireMessage(doc.id);
          result.skipped++;
          continue;
        }

        // Check if max retries exceeded
        if (message.retryCount >= message.maxRetries) {
          await this.markMessageAsFailed(doc.id);
          result.failed++;
          continue;
        }

        try {
          // Update status to retrying
          await doc.ref.update({
            status: DLQMessageStatus.RETRYING,
            retryCount: (message.retryCount || 0) + 1,
            lastAttemptAt: new Date(),
          });

          // Process message with custom processor if provided
          if (processor) {
            await processor(message);
          }

          // Mark as resolved
          await this.resolveMessage(doc.id);
          result.succeeded++;
        } catch (error) {
          logger.error(`[DLQ] Failed to process message ${doc.id}:`, error);
          result.errors.push({
            messageId: doc.id,
            error: (error as Error).message,
          });

          // Update retry count
          await doc.ref.update({
            status: DLQMessageStatus.PENDING,
            lastAttemptAt: new Date(),
          });

          result.failed++;
        }
      }

      logger.info('[DLQ] Processing result:', result);
      await this.logDLQEvent('batch', 'batch_processed', result);

      return result;
    } catch (error) {
      logger.error('[DLQ] Failed to process queue:', error);
      throw error;
    }
  }

  /**
   * Get dead letter queue status and statistics
   */
  public async getDeadLetterQueueStatus(): Promise<DLQStatistics> {
    try {
      this.initializeFirestore();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const collection = this.db.collection(this.collectionName);

      // Get counts by status
      const [pendingSnap, retryingSnap, failedSnap, resolvedSnap, expiredSnap, allSnap] =
        await Promise.all([
          collection.where('status', '==', DLQMessageStatus.PENDING).count().get(),
          collection.where('status', '==', DLQMessageStatus.RETRYING).count().get(),
          collection.where('status', '==', DLQMessageStatus.FAILED).count().get(),
          collection.where('status', '==', DLQMessageStatus.RESOLVED).count().get(),
          collection.where('status', '==', DLQMessageStatus.EXPIRED).count().get(),
          collection.count().get(),
        ]);

      // Get oldest and newest messages
      const oldestSnap = await collection.orderBy('firstFailedAt', 'asc').limit(1).get();
      const newestSnap = await collection.orderBy('firstFailedAt', 'desc').limit(1).get();

      // Calculate average retries
      const messagesSnap = await collection.select('retryCount').get();
      const totalRetries = messagesSnap.docs.reduce(
        (sum, doc) => sum + (doc.data().retryCount || 0),
        0
      );
      const averageRetries = messagesSnap.size > 0 ? totalRetries / messagesSnap.size : 0;

      const stats: DLQStatistics = {
        totalMessages: allSnap.data().count,
        pendingMessages: pendingSnap.data().count,
        retryingMessages: retryingSnap.data().count,
        failedMessages: failedSnap.data().count,
        resolvedMessages: resolvedSnap.data().count,
        expiredMessages: expiredSnap.data().count,
        oldestMessage: oldestSnap.empty
          ? undefined
          : oldestSnap.docs[0]?.data().firstFailedAt?.toDate(),
        newestMessage: newestSnap.empty
          ? undefined
          : newestSnap.docs[0]?.data().firstFailedAt?.toDate(),
        averageRetries,
      };

      logger.info('[DLQ] Queue statistics:', stats);
      return stats;
    } catch (error) {
      logger.error('[DLQ] Failed to get queue status:', error);
      throw error;
    }
  }

  /**
   * Retry a specific dead letter message
   */
  public async retryDeadLetterMessage(messageId: string): Promise<boolean> {
    try {
      this.initializeFirestore();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const docRef = this.db.collection(this.collectionName).doc(messageId);
      const doc = await docRef.get();

      if (!doc.exists) {
        logger.error(`[DLQ] Message ${messageId} not found`);
        return false;
      }

      const message = doc.data() as DLQMessage;

      // Check if message can be retried
      if (message.retryCount >= message.maxRetries) {
        logger.error(`[DLQ] Message ${messageId} has exceeded max retries`);
        return false;
      }

      await docRef.update({
        status: DLQMessageStatus.PENDING,
        lastAttemptAt: new Date(),
      });

      logger.info(`[DLQ] Message ${messageId} queued for retry`);
      await this.logDLQEvent(messageId, 'manual_retry_requested', {});

      return true;
    } catch (error) {
      logger.error(`[DLQ] Failed to retry message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Export dead letter queue messages for analysis
   */
  public async exportDeadLetterQueue(
    format: 'json' | 'csv' = 'json',
    filter?: { status?: DLQMessageStatus; fromDate?: Date; toDate?: Date }
  ): Promise<string> {
    try {
      this.initializeFirestore();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      let query: FirebaseFirestore.Query = this.db.collection(this.collectionName);

      // Apply filters
      if (filter?.status) {
        query = query.where('status', '==', filter.status);
      }
      if (filter?.fromDate) {
        query = query.where('firstFailedAt', '>=', filter.fromDate);
      }
      if (filter?.toDate) {
        query = query.where('firstFailedAt', '<=', filter.toDate);
      }

      const snapshot = await query.get();
      const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      if (format === 'json') {
        return JSON.stringify(messages, null, 2);
      } else {
        // CSV format
        if (messages.length === 0) return '';

        const firstMessage = messages[0];
        if (!firstMessage) return '';

        const headers = Object.keys(firstMessage).join(',');
        const rows = messages.map((msg) => Object.values(msg).join(','));
        return [headers, ...rows].join('\n');
      }
    } catch (error) {
      logger.error('[DLQ] Failed to export queue:', error);
      throw error;
    }
  }

  /**
   * Configure maximum retry attempts
   */
  public configureMaxRetries(maxRetries: number): void {
    this.defaultMaxRetries = maxRetries;
    logger.info(`[DLQ] Max retries configured to: ${maxRetries}`);
  }

  /**
   * Configure message expiration period
   */
  public configureExpiration(days: number): void {
    this.defaultExpirationDays = days;
    logger.info(`[DLQ] Expiration configured to: ${days} days`);
  }

  /**
   * Monitor dead letter queue health
   */
  public async monitorDeadLetterQueue(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const stats = await this.getDeadLetterQueueStatus();
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check for high failure rate
      if (stats.failedMessages > 100) {
        issues.push(`High number of permanently failed messages: ${stats.failedMessages}`);
        recommendations.push('Review error patterns and fix underlying issues');
      }

      // Check for old pending messages
      if (stats.oldestMessage) {
        const ageInHours = (Date.now() - stats.oldestMessage.getTime()) / (1000 * 60 * 60);
        if (ageInHours > 24) {
          issues.push(`Oldest pending message is ${ageInHours.toFixed(1)} hours old`);
          recommendations.push('Process pending messages or increase processing frequency');
        }
      }

      // Check for high retry rates
      if (stats.averageRetries > 2) {
        issues.push(`High average retry count: ${stats.averageRetries.toFixed(2)}`);
        recommendations.push('Investigate why messages are failing repeatedly');
      }

      const healthy = issues.length === 0;

      logger.info('[DLQ] Health check:', { healthy, issues, recommendations });

      return { healthy, issues, recommendations };
    } catch (error) {
      logger.error('[DLQ] Failed to monitor queue:', error);
      return {
        healthy: false,
        issues: ['Failed to perform health check'],
        recommendations: ['Check Firestore connectivity'],
      };
    }
  }

  /**
   * Purge old messages from dead letter queue
   */
  public async purgeDeadLetterQueue(olderThan: Date): Promise<number> {
    try {
      this.initializeFirestore();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const snapshot = await this.db
        .collection(this.collectionName)
        .where('firstFailedAt', '<', olderThan)
        .get();

      logger.info(`[DLQ] Purging ${snapshot.size} messages older than ${olderThan}`);

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      await this.logDLQEvent('purge', 'messages_purged', { count: snapshot.size, olderThan });

      return snapshot.size;
    } catch (error) {
      logger.error('[DLQ] Failed to purge queue:', error);
      throw error;
    }
  }

  /**
   * Mark message as resolved
   */
  private async resolveMessage(messageId: string): Promise<void> {
    try {
      if (!this.db) return;

      await this.db.collection(this.collectionName).doc(messageId).update({
        status: DLQMessageStatus.RESOLVED,
        resolvedAt: new Date(),
      });

      logger.info(`[DLQ] Message ${messageId} resolved`);
      await this.logDLQEvent(messageId, 'message_resolved', {});
    } catch (error) {
      logger.error(`[DLQ] Failed to resolve message ${messageId}:`, error);
    }
  }

  /**
   * Mark message as permanently failed
   */
  private async markMessageAsFailed(messageId: string): Promise<void> {
    try {
      if (!this.db) return;

      await this.db.collection(this.collectionName).doc(messageId).update({
        status: DLQMessageStatus.FAILED,
        lastAttemptAt: new Date(),
      });

      logger.info(`[DLQ] Message ${messageId} marked as permanently failed`);
      await this.logDLQEvent(messageId, 'message_failed', {});
    } catch (error) {
      logger.error(`[DLQ] Failed to mark message ${messageId} as failed:`, error);
    }
  }

  /**
   * Mark message as expired
   */
  private async expireMessage(messageId: string): Promise<void> {
    try {
      if (!this.db) return;

      await this.db.collection(this.collectionName).doc(messageId).update({
        status: DLQMessageStatus.EXPIRED,
      });

      logger.info(`[DLQ] Message ${messageId} expired`);
      await this.logDLQEvent(messageId, 'message_expired', {});
    } catch (error) {
      logger.error(`[DLQ] Failed to expire message ${messageId}:`, error);
    }
  }

  /**
   * Log DLQ event to Firestore
   */
  private async logDLQEvent(
    messageId: string,
    eventType: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      if (!this.db) return;

      await this.db.collection('dlq_events').add({
        messageId,
        eventType,
        metadata,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('[DLQ] Failed to log event:', error);
    }
  }
}

// Export singleton instance
export const deadLetterQueueService = DeadLetterQueueService.getInstance();
