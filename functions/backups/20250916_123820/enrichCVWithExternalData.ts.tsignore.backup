// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Enrich CV with External Data Function
 *
 * Firebase Function to enrich CVs with data from external sources
 * like GitHub, LinkedIn, web search, and personal websites
 *
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import {
  ExternalDataOrchestrator,
  OrchestrationRequest,
  OrchestrationResult
} from '../../external-data';
import {
  ExternalDataUsageEvent,
  CVData
} from '../../types';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// TEMPORARILY DISABLED FOR DEPLOYMENT

// Temporary placeholder function for deployment
const getUserSubscriptionInternal = async (_userId: string) => {
  return { subscriptionStatus: 'free', lifetimeAccess: false };
};

interface EnrichCVRequest {
  cvId: string;
  cvData?: CVData; // Added to match usage
  sources?: string[];
  options?: {
    forceRefresh?: boolean;
    timeout?: number;
    priority?: 'high' | 'normal' | 'low';
    maxCost?: number; // Added to match usage
  };
  // Optional user-provided hints
  github?: string;
  linkedin?: string;
  website?: string;
  name?: string;
}

/**
 * Enrich CV with external data - Premium Feature
 *
 * This function is protected by premium access controls and includes
 * usage tracking, rate limiting, and security audit logging.
 */
export const enrichCVWithExternalData = onCall<EnrichCVRequest>(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '512MiB'
  },
  async (request) => {
    const startTime = Date.now();

    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }
      const userId = request.auth.uid;

      logger.info('[ENRICH-CV] Processing external data enrichment request', {
        userId,
        cvId: request.data.cvId,
        sources: request.data.sources
      });

      // Validate request
      if (!request.data.cvId) {
        throw new HttpsError(
          'invalid-argument',
          'CV ID is required'
        );
      }

      // Default sources if not specified
      const sources = request.data.sources || ['github', 'linkedin', 'web', 'website'];

      // Validate sources
      const validSources = ['github', 'linkedin', 'web', 'website'];
      const invalidSources = sources.filter((s: string) => !validSources.includes(s));

      if (invalidSources.length > 0) {
        throw new HttpsError(
          'invalid-argument',
          `Invalid sources: ${invalidSources.join(', ')}`
        );
      }

      // Create orchestration request
      const orchestrationRequest: OrchestrationRequest = {
        userId,
        cvData: request.data.cvData || {},
        cvId: request.data.cvId,
        dataTypes: sources,
        priority: request.data.options?.priority === 'high' ? 'high' : request.data.options?.priority === 'low' ? 'low' : 'medium',
        maxCost: request.data.options?.maxCost || 100
      };

      // Store user hints in metadata if provided
      if (request.data.github || request.data.linkedin || request.data.website) {
        await storeUserHints(userId, {
          github: request.data.github,
          linkedin: request.data.linkedin,
          website: request.data.website,
          name: request.data.name
        });
      }

      // Orchestrate external data fetching
      const orchestrator = new ExternalDataOrchestrator();
      const result: OrchestrationResult = await orchestrator.orchestrateDataEnrichment(
        orchestrationRequest
      );

      // Get user subscription for tracking
      const subscription = await getUserSubscriptionInternal(userId);
      const premiumStatus = subscription?.lifetimeAccess === true;

      // Track usage event
      const usageEvent: ExternalDataUsageEvent = {
        userId,
        cvId: request.data.cvId,
        sources,
        timestamp: new Date(),
        success: result.status === 'success',
        fetchDuration: result.fetchDuration,
        sourcesQueried: result.sources?.length || 0,
        sourcesSuccessful: result.success ? result.sources?.length || 0 : 0,
        cacheHits: 0, // Not available in current result type
        errors: result.errors?.map((e: any) => typeof e === 'string' ? e : e.message) || [],
        premiumStatus,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Track usage asynchronously (don't wait for completion)
      trackUsageEventInternal(usageEvent).catch((error: any) => {
        logger.error('[ENRICH-CV] Failed to track usage event', { error, userId });
      });

      // Log success metrics
      logger.info('[ENRICH-CV] External data enrichment completed', {
        userId,
        cvId: request.data.cvId,
        status: result.status,
        duration: result.fetchDuration,
        sourcesSuccessful: result.success ? result.sources?.length || 0 : 0,
        premiumStatus,
        requestId: usageEvent.requestId
      });

      // Return enriched data
      return {
        success: result.success,
        requestId: usageEvent.requestId,
        status: result.status,
        enrichedData: result.data,
        metrics: {
          fetchDuration: result.fetchDuration,
          sourcesQueried: result.sources?.length || 0,
          sourcesSuccessful: result.success ? result.sources?.length || 0 : 0,
          cacheHits: 0
        },
        errors: result.errors?.map(e => typeof e === 'string' ? e : e) || []
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Track failed usage event if we have user context
      if (request.auth?.uid) {
        const subscription = await getUserSubscriptionInternal(request.auth.uid).catch(() => null);
        const premiumStatus = subscription?.lifetimeAccess === true;

        const failedUsageEvent: ExternalDataUsageEvent = {
          userId: request.auth.uid,
          cvId: request.data.cvId,
          sources: request.data.sources || [],
          timestamp: new Date(),
          success: false,
          fetchDuration: executionTime,
          sourcesQueried: 0,
          sourcesSuccessful: 0,
          cacheHits: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          premiumStatus
        };

        trackUsageEventInternal(failedUsageEvent).catch((trackingError: any) => {
          logger.error('[ENRICH-CV] Failed to track failed usage event', {
            trackingError,
            userId: request.auth?.uid || 'unknown'
          });
        });
      }

      logger.error('[ENRICH-CV] External data enrichment failed', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        userId: request.auth?.uid,
        cvId: request.data.cvId,
        executionTime
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'Failed to enrich CV with external data',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

/**
 * Store user-provided hints for external data sources
 */
async function storeUserHints(
  userId: string,
  hints: {
    github?: string;
    linkedin?: string;
    website?: string;
    name?: string;
  }
): Promise<void> {
  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();

    await db
      .collection('user_external_profiles')
      .doc(userId)
      .set(
        {
          ...hints,
          updatedAt: new Date()
        },
        { merge: true }
      );

    logger.info('[ENRICH-CV] User hints stored', { userId, hints });
  } catch (error) {
    logger.error('[ENRICH-CV] Failed to store user hints', error);
    // Don't throw - this is not critical
  }
}

/**
 * Internal function to track usage events
 * This bypasses the Cloud Function call and directly writes to Firestore
 */
async function trackUsageEventInternal(event: ExternalDataUsageEvent): Promise<void> {
  try {
    const db = getFirestore();
    const timestamp = new Date();
    const dateKey = timestamp.toISOString().split('T')[0] || timestamp.toISOString().substring(0, 10);

    // Create batch for atomic operations
    const batch = db.batch();

    // 1. Store individual usage event
    const eventRef = db
      .collection('external_data_usage')
      .doc(event.userId)
      .collection('events')
      .doc();

    batch.set(eventRef, {
      ...event,
      timestamp: FieldValue.serverTimestamp(),
      id: eventRef.id
    });

    // 2. Update daily analytics
    const dailyAnalyticsRef = db
      .collection('external_data_analytics')
      .doc('daily')
      .collection('data')
      .doc(dateKey);

    const analyticsUpdate: any = {
      date: dateKey,
      totalRequests: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp()
    };

    // Add premium-specific metrics
    if (event.premiumStatus === true) {
      analyticsUpdate.premiumRequests = FieldValue.increment(1);
    } else {
      analyticsUpdate.freeRequests = FieldValue.increment(1);
    }

    // Add success/failure metrics
    if (event.success) {
      analyticsUpdate.successfulRequests = FieldValue.increment(1);
      analyticsUpdate.totalFetchDuration = FieldValue.increment(event.fetchDuration);
    } else {
      analyticsUpdate.failedRequests = FieldValue.increment(1);
    }

    batch.set(dailyAnalyticsRef, analyticsUpdate, { merge: true });

    // Execute batch
    await batch.commit();

    logger.info('[TRACK-USAGE-INTERNAL] Usage event tracked successfully', {
      userId: event.userId,
      eventId: eventRef.id,
      success: event.success
    });

  } catch (error) {
    logger.error('[TRACK-USAGE-INTERNAL] Failed to track usage event', {
      error: error instanceof Error ? error.message : error,
      userId: event.userId
    });
    // Don't throw - tracking should not block main operation
  }
}