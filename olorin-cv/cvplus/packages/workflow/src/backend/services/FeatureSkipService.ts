/**
 * Feature Skip Service
 *
 * Service for managing feature skipping functionality within job workflows,
 * handling skip reasons, and updating workflow state accordingly.
  */

import { getFirestore } from 'firebase-admin/firestore';
import { Feature, FeatureStatus, SkippedFeature } from '../../types/Feature';

export class FeatureSkipService {
  private db: FirebaseFirestore.Firestore | null = null;

  /**
   * Initialize Firestore database connection
   */
  private async initialize(): Promise<FirebaseFirestore.Firestore> {
    if (!this.db) {
      this.db = getFirestore();
    }
    return this.db;
  }

  /**
   * Skip a feature in a job workflow
    */
  async skipFeature(
    jobId: string,
    featureId: string,
    reason?: string,
    skipMetadata?: any
  ): Promise<SkippedFeature> {
    const db = await this.initialize();

    try {
      // Get feature details first
      const featureDoc = await db
        .collection('features')
        .doc(featureId)
        .get();

      if (!featureDoc.exists) {
        throw new Error(`Feature ${featureId} not found`);
      }

      const featureData = featureDoc.data() as Feature;

      // Perform impact analysis before skipping
      const impactAnalysis = await this.getSkipImpactAnalysis(jobId, featureId);

      const skippedFeature: SkippedFeature = {
        id: featureId,
        jobId,
        name: featureData.name,
        status: 'skipped',
        skippedAt: new Date(),
        skipReason: reason,
        skippedBy: skipMetadata?.userId || 'system',
        impactAssessment: {
          dependentFeatures: impactAnalysis.dependentFeatures,
          qualityImpact: impactAnalysis.qualityImpact,
          completionImpact: impactAnalysis.completionImpact
        },
        metadata: skipMetadata
      };

      // Store in skipped_features collection
      await db
        .collection('skipped_features')
        .doc(`${jobId}_${featureId}`)
        .set(skippedFeature);

      // Update feature status
      await db
        .collection('features')
        .doc(featureId)
        .update({
          status: 'skipped' as FeatureStatus,
          updatedAt: new Date()
        });

      logger.info(`[FeatureSkipService] Skipped feature ${featureId} for job ${jobId}`);
      return skippedFeature;

    } catch (error) {
      logger.error(`[FeatureSkipService] Error skipping feature ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Get all skipped features for a job
    */
  async getSkippedFeatures(jobId: string): Promise<SkippedFeature[]> {
    const db = await this.initialize();

    try {
      const snapshot = await db
        .collection('skipped_features')
        .where('jobId', '==', jobId)
        .get();

      return snapshot.docs.map(doc => doc.data() as SkippedFeature);

    } catch (error) {
      logger.error(`[FeatureSkipService] Error retrieving skipped features for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a feature is skipped for a job
    */
  async isFeatureSkipped(jobId: string, featureId: string): Promise<boolean> {
    const db = await this.initialize();

    try {
      const doc = await db
        .collection('skipped_features')
        .doc(`${jobId}_${featureId}`)
        .get();

      return doc.exists;

    } catch (error) {
      logger.error(`[FeatureSkipService] Error checking skip status for feature ${featureId}:`, error);
      return false;
    }
  }

  /**
   * Unskip a feature (mark as available again)
    */
  async unskipFeature(jobId: string, featureId: string): Promise<void> {
    const db = await this.initialize();

    try {
      // Remove from skipped_features collection
      await db
        .collection('skipped_features')
        .doc(`${jobId}_${featureId}`)
        .delete();

      // Update feature status back to pending
      await db
        .collection('features')
        .doc(featureId)
        .update({
          status: 'pending' as FeatureStatus,
          updatedAt: new Date()
        });

      logger.info(`[FeatureSkipService] Unskipped feature ${featureId} for job ${jobId}`);

    } catch (error) {
      logger.error(`[FeatureSkipService] Error unskipping feature ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Get skip reason for a specific feature
   */
  async getSkipReason(jobId: string, featureId: string): Promise<string | null> {
    const db = await this.initialize();

    try {
      const doc = await db
        .collection('skipped_features')
        .doc(`${jobId}_${featureId}`)
        .get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data() as SkippedFeature;
      return data.skipReason || null;

    } catch (error) {
      logger.error(`[FeatureSkipService] Error getting skip reason for feature ${featureId}:`, error);
      return null;
    }
  }

  /**
   * Get skip reasons for analytics
    */
  async getSkipReasons(jobId?: string): Promise<{
    reason: string;
    count: number;
    percentage: number;
  }[]> {
    const db = await this.initialize();

    try {
      let query = db.collection('skipped_features');

      if (jobId) {
        query = query.where('jobId', '==', jobId) as any;
      }

      const snapshot = await query.get();
      const reasonCounts: Record<string, number> = {};
      const total = snapshot.size;

      snapshot.docs.forEach(doc => {
        const data = doc.data() as SkippedFeature;
        const reason = data.skipReason || 'No reason provided';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });

      return Object.entries(reasonCounts).map(([reason, count]) => ({
        reason,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      })).sort((a, b) => b.count - a.count);

    } catch (error) {
      logger.error(`[FeatureSkipService] Error getting skip reasons:`, error);
      throw error;
    }
  }

  /**
   * Get skip statistics for a job
   */
  async getSkipStatistics(jobId: string): Promise<{
    totalSkipped: number;
    skipReasons: { reason: string; count: number }[];
    mostSkippedFeatures: { featureId: string; name: string; count: number }[];
  }> {
    const db = await this.initialize();

    try {
      const skippedFeatures = await this.getSkippedFeatures(jobId);
      const reasonCounts: Record<string, number> = {};
      const featureCounts: Record<string, { name: string; count: number }> = {};

      skippedFeatures.forEach(sf => {
        const reason = sf.skipReason || 'No reason provided';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;

        if (!featureCounts[sf.id]) {
          featureCounts[sf.id] = { name: sf.name, count: 0 };
        }
        featureCounts[sf.id].count++;
      });

      return {
        totalSkipped: skippedFeatures.length,
        skipReasons: Object.entries(reasonCounts).map(([reason, count]) => ({ reason, count })),
        mostSkippedFeatures: Object.entries(featureCounts)
          .map(([featureId, data]) => ({ featureId, ...data }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      };

    } catch (error) {
      logger.error(`[FeatureSkipService] Error getting skip statistics:`, error);
      throw error;
    }
  }

  /**
   * Analyze skip impact
   */
  async analyzeSkipImpact(jobId: string, featureId: string): Promise<{
    canSkip: boolean;
    dependentFeatures: string[];
    qualityImpact: number;
    recommendations: string[];
  }> {
    const db = await this.initialize();

    try {
      const impactAnalysis = await this.getSkipImpactAnalysis(jobId, featureId);
      const canSkipCheck = await this.canSkipFeature(jobId, featureId);

      const recommendations: string[] = [];

      if (impactAnalysis.dependentFeatures.length > 0) {
        recommendations.push(`Skipping will affect ${impactAnalysis.dependentFeatures.length} dependent feature(s)`);
      }

      if (impactAnalysis.qualityImpact > 50) {
        recommendations.push('High quality impact - consider completing this feature');
      } else if (impactAnalysis.qualityImpact > 25) {
        recommendations.push('Moderate quality impact - review carefully');
      }

      return {
        canSkip: canSkipCheck.canSkip,
        dependentFeatures: impactAnalysis.dependentFeatures,
        qualityImpact: impactAnalysis.qualityImpact,
        recommendations
      };

    } catch (error) {
      logger.error(`[FeatureSkipService] Error analyzing skip impact:`, error);
      throw error;
    }
  }

  /**
   * Check if feature can be skipped
    */
  async canSkipFeature(jobId: string, featureId: string): Promise<{
    canSkip: boolean;
    reason?: string;
    dependencies?: string[];
  }> {
    const db = await this.initialize();

    try {
      // Get feature details
      const featureDoc = await db
        .collection('features')
        .doc(featureId)
        .get();

      if (!featureDoc.exists) {
        return {
          canSkip: false,
          reason: 'Feature not found'
        };
      }

      const featureData = featureDoc.data() as Feature;

      // Check if feature is already completed
      if (featureData.status === 'completed') {
        return {
          canSkip: false,
          reason: 'Feature is already completed'
        };
      }

      // Check if there are features that require this one
      const dependentFeaturesSnapshot = await db
        .collection('features')
        .where('dependencies', 'array-contains', featureId)
        .get();

      const dependentFeatures = dependentFeaturesSnapshot.docs.map(doc => doc.id);

      // Check if any dependent features are already completed
      const completedDependents = await Promise.all(
        dependentFeatures.map(async (depId) => {
          const depDoc = await db.collection('features').doc(depId).get();
          const depData = depDoc.data() as Feature;
          return depData.status === 'completed' ? depId : null;
        })
      );

      const hasCompletedDependents = completedDependents.some(id => id !== null);

      if (hasCompletedDependents) {
        return {
          canSkip: false,
          reason: 'Some dependent features are already completed',
          dependencies: dependentFeatures
        };
      }

      // Feature can be skipped if no blocking conditions
      return {
        canSkip: true,
        dependencies: dependentFeatures
      };

    } catch (error) {
      logger.error(`[FeatureSkipService] Error checking if feature can be skipped:`, error);
      return {
        canSkip: false,
        reason: 'Error checking skip eligibility'
      };
    }
  }

  /**
   * Get skip suggestions based on job context
    */
  async getSkipSuggestions(jobId: string): Promise<{
    featureId: string;
    reason: string;
    confidence: number;
    potentialImpact: 'low' | 'medium' | 'high';
  }[]> {
    const db = await this.initialize();

    try {
      // Get job features
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        return [];
      }

      const jobData = jobDoc.data();
      const featureIds = jobData?.features || [];

      const suggestions: {
        featureId: string;
        reason: string;
        confidence: number;
        potentialImpact: 'low' | 'medium' | 'high';
      }[] = [];

      // Analyze each feature
      for (const featureId of featureIds) {
        const featureDoc = await db.collection('features').doc(featureId).get();
        if (!featureDoc.exists) continue;

        const featureData = featureDoc.data() as Feature;

        // Skip if already completed or skipped
        if (featureData.status === 'completed' || featureData.status === 'skipped') {
          continue;
        }

        // Check priority - suggest skipping low priority features
        if (featureData.priority === 'low') {
          const impactAnalysis = await this.getSkipImpactAnalysis(jobId, featureId);

          suggestions.push({
            featureId,
            reason: 'Low priority feature with minimal dependencies',
            confidence: impactAnalysis.dependentFeatures.length === 0 ? 0.8 : 0.5,
            potentialImpact: impactAnalysis.qualityImpact > 50 ? 'high' :
                            impactAnalysis.qualityImpact > 25 ? 'medium' : 'low'
          });
        }

        // Suggest features with long estimated duration
        if (featureData.estimatedDuration && featureData.estimatedDuration > 60) {
          const impactAnalysis = await this.getSkipImpactAnalysis(jobId, featureId);

          suggestions.push({
            featureId,
            reason: 'Time-consuming feature - consider skipping to speed up workflow',
            confidence: 0.6,
            potentialImpact: impactAnalysis.qualityImpact > 50 ? 'high' :
                            impactAnalysis.qualityImpact > 25 ? 'medium' : 'low'
          });
        }
      }

      // Sort by confidence and limit results
      return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

    } catch (error) {
      logger.error(`[FeatureSkipService] Error getting skip suggestions:`, error);
      return [];
    }
  }

  /**
   * Update skip reason for an already skipped feature
    */
  async updateSkipReason(
    jobId: string,
    featureId: string,
    newReason: string
  ): Promise<void> {
    const db = await this.initialize();

    try {
      const docRef = db
        .collection('skipped_features')
        .doc(`${jobId}_${featureId}`);

      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Feature ${featureId} is not skipped for job ${jobId}`);
      }

      await docRef.update({
        skipReason: newReason,
        'metadata.updatedAt': new Date()
      });

      logger.info(`[FeatureSkipService] Updated skip reason for feature ${featureId}`);

    } catch (error) {
      logger.error(`[FeatureSkipService] Error updating skip reason:`, error);
      throw error;
    }
  }

  /**
   * Get skip history for a job
   */
  async getSkipHistory(jobId: string): Promise<SkippedFeature[]> {
    return this.getSkippedFeatures(jobId);
  }

  /**
   * Bulk skip features
   */
  async bulkSkipFeatures(
    jobId: string,
    featureIds: string[],
    reason: string
  ): Promise<SkippedFeature[]> {
    const db = await this.initialize();
    const skippedFeatures: SkippedFeature[] = [];

    try {
      const batch = db.batch();

      for (const featureId of featureIds) {
        const canSkipCheck = await this.canSkipFeature(jobId, featureId);

        if (!canSkipCheck.canSkip) {
          logger.warn(`[FeatureSkipService] Cannot skip feature ${featureId}: ${canSkipCheck.reason}`);
          continue;
        }

        const skippedFeature = await this.skipFeature(jobId, featureId, reason);
        skippedFeatures.push(skippedFeature);
      }

      await batch.commit();
      logger.info(`[FeatureSkipService] Bulk skipped ${skippedFeatures.length} features`);

      return skippedFeatures;

    } catch (error) {
      logger.error(`[FeatureSkipService] Error in bulk skip:`, error);
      throw error;
    }
  }

  /**
   * Get skip reasons statistics (global)
   */
  async getSkipReasonsStatistics(): Promise<{
    totalSkipped: number;
    reasonBreakdown: { reason: string; count: number; percentage: number }[];
    topReasons: string[];
  }> {
    const db = await this.initialize();

    try {
      const snapshot = await db.collection('skipped_features').get();
      const reasonCounts: Record<string, number> = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data() as SkippedFeature;
        const reason = data.skipReason || 'No reason provided';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });

      const total = snapshot.size;
      const reasonBreakdown = Object.entries(reasonCounts).map(([reason, count]) => ({
        reason,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      })).sort((a, b) => b.count - a.count);

      return {
        totalSkipped: total,
        reasonBreakdown,
        topReasons: reasonBreakdown.slice(0, 5).map(r => r.reason)
      };

    } catch (error) {
      logger.error(`[FeatureSkipService] Error getting skip reasons statistics:`, error);
      throw error;
    }
  }

  /**
   * Recover from skip - unskip and restart feature
   */
  async recoverFromSkip(jobId: string, featureId: string): Promise<void> {
    return this.unskipFeature(jobId, featureId);
  }

  /**
   * Get skip impact analysis
    */
  async getSkipImpactAnalysis(jobId: string, featureId: string): Promise<{
    dependentFeatures: string[];
    affectedOutputs: string[];
    qualityImpact: number;
    completionImpact: number;
  }> {
    const db = await this.initialize();

    try {
      // Get feature details
      const featureDoc = await db
        .collection('features')
        .doc(featureId)
        .get();

      if (!featureDoc.exists) {
        return {
          dependentFeatures: [],
          affectedOutputs: [],
          qualityImpact: 0,
          completionImpact: 0
        };
      }

      const featureData = featureDoc.data() as Feature;

      // Find dependent features
      const dependentFeaturesSnapshot = await db
        .collection('features')
        .where('dependencies', 'array-contains', featureId)
        .get();

      const dependentFeatures = dependentFeaturesSnapshot.docs.map(doc => doc.id);

      // Calculate quality impact based on feature priority and category
      let qualityImpact = 0;

      switch (featureData.priority) {
        case 'high':
          qualityImpact = 75;
          break;
        case 'medium':
          qualityImpact = 40;
          break;
        case 'low':
          qualityImpact = 15;
          break;
      }

      // Adjust based on category
      if (featureData.category === 'content' || featureData.category === 'analysis') {
        qualityImpact += 15;
      }

      // Cap at 100
      qualityImpact = Math.min(qualityImpact, 100);

      // Calculate completion impact
      const completionImpact = dependentFeatures.length > 0
        ? Math.min(dependentFeatures.length * 20, 100)
        : 10;

      // Determine affected outputs
      const affectedOutputs: string[] = [];

      if (featureData.category === 'export') {
        affectedOutputs.push('PDF Export', 'Document Generation');
      }
      if (featureData.category === 'multimedia') {
        affectedOutputs.push('Media Generation', 'Video/Audio Content');
      }
      if (featureData.category === 'sharing') {
        affectedOutputs.push('Social Sharing', 'Public Profile');
      }

      return {
        dependentFeatures,
        affectedOutputs,
        qualityImpact,
        completionImpact
      };

    } catch (error) {
      logger.error(`[FeatureSkipService] Error analyzing skip impact:`, error);
      return {
        dependentFeatures: [],
        affectedOutputs: [],
        qualityImpact: 0,
        completionImpact: 0
      };
    }
  }
}

// Export singleton instance
export const featureSkipService = new FeatureSkipService();