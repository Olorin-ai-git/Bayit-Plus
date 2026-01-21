// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Cloud Functions for Personality Insights
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { personalityInsightsService } from '../services/personality-insights.service';
import { EnhancedJob } from '../types/enhanced-models';
import { corsOptions } from '../config/cors';

interface PersonalityInsightsRequest {
  jobId: string;
  settings?: {
    depth?: 'basic' | 'detailed' | 'comprehensive';
    includeWorkStyle?: boolean;
    includeTeamDynamics?: boolean;
  };
}

interface ComparePersonalitiesRequest {
  jobId1: string;
  jobId2: string;
}

interface GetInsightsSummaryRequest {
  jobId: string;
}

interface UpdateSettingsRequest {
  jobId: string;
  settings: {
    visibility?: 'public' | 'private' | 'recruiters-only';
    displayOptions?: {
      showChart?: boolean;
      showDetails?: boolean;
      showWorkStyle?: boolean;
    };
  };
}

/**
 * Generate personality insights from CV
 */
export const generatePersonalityInsights = onCall<PersonalityInsightsRequest>(
  {
    timeoutSeconds: 120,
    ...corsOptions
  },
  async (request: CallableRequest<PersonalityInsightsRequest>) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, settings } = request.data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      // Generate personality insights
      const insights = await personalityInsightsService.generateInsights(
        job.parsedData!,
        settings?.depth || 'detailed',
        {
          includeWorkStyle: settings?.includeWorkStyle !== false,
          includeTeamDynamics: settings?.includeTeamDynamics !== false
        }
      );

      // Update job with personality insights
      await jobDoc.ref.update({
        'enhancedFeatures.personalityInsights': {
          enabled: true,
          data: insights,
          status: 'completed',
          processedAt: new Date()
        }
      });

      return {
        success: true,
        insights
      };

    } catch (error: any) {
      
      // Update job with error status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.personalityInsights.status': 'failed',
        'enhancedFeatures.personalityInsights.error': error.message
      });
      
      throw new HttpsError('internal', 'Failed to generate personality insights');
    }
  }
);

/**
 * Compare personalities between two CVs
 */
export const comparePersonalities = onCall<ComparePersonalitiesRequest>(
  {
    timeoutSeconds: 90,
    ...corsOptions
  },
  async (request: CallableRequest<ComparePersonalitiesRequest>) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId1, jobId2 } = request.data;
    if (!jobId1 || !jobId2) {
      throw new HttpsError('invalid-argument', 'Both job IDs are required');
    }

    try {
      // Get both jobs and verify ownership
      const [job1Doc, job2Doc] = await Promise.all([
        admin.firestore().collection('jobs').doc(jobId1).get(),
        admin.firestore().collection('jobs').doc(jobId2).get()
      ]);

      if (!job1Doc.exists || !job2Doc.exists) {
        throw new HttpsError('not-found', 'One or both jobs not found');
      }

      const job1 = job1Doc.data() as EnhancedJob;
      const job2 = job2Doc.data() as EnhancedJob;

      if (job1.userId !== request.auth.uid || job2.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to jobs');
      }

      // Ensure both have personality insights
      if (!job1.enhancedFeatures?.personalityInsights?.data || !job2.enhancedFeatures?.personalityInsights?.data) {
        throw new HttpsError('failed-precondition', 'Both CVs must have personality insights generated');
      }

      // Compare personalities
      const comparison = await personalityInsightsService.comparePersonalities(
        insights1,
        insights2
      );

      return {
        success: true,
        comparison
      };

    } catch (error) {
      throw new HttpsError('internal', 'Failed to compare personalities');
    }
  }
);

/**
 * Get personality insights summary
 */
export const getPersonalityInsightsSummary = onCall<GetInsightsSummaryRequest>(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest<GetInsightsSummaryRequest>) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = request.data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      const insights = job.enhancedFeatures?.personalityInsights?.data || job.enhancedFeatures?.personalityInsights;
      if (!insights) {
        throw new HttpsError('not-found', 'Personality insights not found');
      }

      // Generate summary
      const summary = personalityInsightsService.generateSummary(insights);

      return {
        success: true,
        summary
      };

    } catch (error) {
      throw new HttpsError('internal', 'Failed to get personality insights summary');
    }
  }
);

/**
 * Update personality insights display settings
 */
export const updatePersonalitySettings = onCall<UpdateSettingsRequest>(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest<UpdateSettingsRequest>) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, settings } = request.data;
    if (!jobId || !settings) {
      throw new HttpsError('invalid-argument', 'Job ID and settings are required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      // Update settings
      await jobDoc.ref.update({
        'enhancedFeatures.personalityInsights.settings': settings,
        'enhancedFeatures.personalityInsights.settingsUpdatedAt': new Date()
      });

      return {
        success: true,
        settings
      };

    } catch (error) {
      throw new HttpsError('internal', 'Failed to update personality settings');
    }
  }
);