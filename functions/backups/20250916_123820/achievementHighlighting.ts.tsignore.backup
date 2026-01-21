// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Cloud Functions for Achievement Highlighting
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { AchievementsAnalysisService } from '../services/achievements-analysis.service';
import { EnhancedJob, ParsedCV } from '../types/enhanced-models';
import { corsOptions } from '../config/cors';

/**
 * Analyze and highlight achievements in CV
 */
export const analyzeAchievements = onCall(
  { 
    timeoutSeconds: 120,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    // Check authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = data;
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
      if (job.userId !== auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      if (!job.parsedData) {
        throw new HttpsError('failed-precondition', 'CV must be parsed before analyzing achievements');
      }

      // Analyze achievements
      const achievementsService = new AchievementsAnalysisService();
      const achievements = await achievementsService.extractKeyAchievements(job.parsedData as unknown as ParsedCV);

      // Calculate achievement statistics
      const stats = {
        total: achievements.length,
        byCategory: achievements.reduce((acc, achievement) => {
          acc[achievement.category] = (acc[achievement.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        averageSignificance: achievements.length > 0 
          ? achievements.reduce((sum, a) => sum + a.significance, 0) / achievements.length 
          : 0,
        withMetrics: achievements.filter(a => a.metrics && a.metrics.length > 0).length,
        highImpact: achievements.filter(a => a.significance >= 8).length
      };

      // Update job with achievement analysis
      await jobDoc.ref.update({
        'enhancedFeatures.achievementHighlighting': {
          enabled: true,
          data: {
            achievements,
            stats,
            analyzedAt: new Date()
          },
          status: 'completed',
          processedAt: new Date()
        }
      });

      return {
        success: true,
        achievements,
        stats,
        recommendations: generateRecommendations(achievements, stats)
      };

    } catch (error: any) {
      
      // Update job with error status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.achievementHighlighting.status': 'failed',
        'enhancedFeatures.achievementHighlighting.error': error.message
      });
      
      throw new HttpsError('internal', 'Failed to analyze achievements');
    }
  }
);

/**
 * Generate achievement showcase HTML for CV
 */
export const generateAchievementShowcase = onCall(
  { 
    timeoutSeconds: 90,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    // Check authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, maxAchievements = 6 } = data;
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
      if (job.userId !== auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      const achievementData = (job.enhancedFeatures?.achievementHighlighting as any)?.data;
      if (!achievementData?.achievements) {
        throw new HttpsError('failed-precondition', 'Achievements must be analyzed first');
      }

      // Generate showcase HTML using existing method
      const achievementsService = new AchievementsAnalysisService();
      const topAchievements = achievementData.achievements
        .sort((a: any, b: any) => b.significance - a.significance)
        .slice(0, maxAchievements);
      
      const showcase = achievementsService.generateAchievementsHTML(topAchievements);

      return {
        success: true,
        showcase,
        selectedAchievements: topAchievements
      };

    } catch (error) {
      throw new HttpsError('internal', 'Failed to generate achievement showcase');
    }
  }
);

/**
 * Generate achievement recommendations
 */
function generateRecommendations(_achievements: any[], stats: any): string[] {
  const recommendations = [];

  if (stats.total === 0) {
    recommendations.push('Add quantifiable achievements to your work experience');
    recommendations.push('Include specific metrics and outcomes for each role');
    return recommendations;
  }

  if (stats.withMetrics < stats.total * 0.5) {
    recommendations.push('Add more quantifiable metrics to strengthen your achievements');
  }

  if (stats.averageSignificance < 6) {
    recommendations.push('Focus on high-impact accomplishments with measurable outcomes');
  }

  if (stats.byCategory.leadership === 0) {
    recommendations.push('Include leadership achievements to demonstrate management skills');
  }

  if (stats.byCategory.business === 0) {
    recommendations.push('Add business impact achievements showing revenue or cost benefits');
  }

  if (stats.highImpact < 3) {
    recommendations.push('Highlight 2-3 of your most significant career accomplishments');
  }

  return recommendations.slice(0, 4); // Limit to top 4 recommendations
}