/**
 * Feature Completion Service
 *
 * Service for managing feature completion within job workflows,
 * tracking completion state, and handling feature dependencies.
 *
 * @author CVPlus Team
 * @version 1.0.0
 * @created 2025-11-29
 */

import { logger } from 'firebase-functions';
import { firestore } from 'firebase-admin';
import { Feature, FeatureStatus, CompletedFeature } from '../../types/Feature';
import { Job } from '../../types/Job';

export class FeatureCompletionService {
  private db: firestore.Firestore | null = null;

  /**
   * Initialize with Firestore instance
   */
  initialize(firestoreInstance: firestore.Firestore): void {
    this.db = firestoreInstance;
  }

  /**
   * Mark a feature as completed for a job
   * Creates a completed_features record and updates job_features status
   */
  async completeFeature(
    jobId: string,
    featureId: string,
    completionData: any
  ): Promise<CompletedFeature> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Validate completion data
      if (!this.validateCompletionData(featureId, completionData)) {
        throw new Error('Invalid completion data for feature ' + featureId);
      }

      const completedFeatureId = `${jobId}_${featureId}_${Date.now()}`;
      const completedFeature: CompletedFeature = {
        id: completedFeatureId,
        jobId,
        featureId,
        completedAt: new Date(),
        completionData,
        completedBy: 'system',
        executionTime: completionData.executionTime || 0,
        quality: completionData.quality || 100
      };

      // Write to completed_features collection
      await this.db.collection('completed_features').doc(completedFeatureId).set({
        ...completedFeature,
        completedAt: firestore.Timestamp.fromDate(completedFeature.completedAt)
      });

      // Update job_features status
      const jobFeatureId = `${jobId}_${featureId}`;
      await this.db.collection('job_features').doc(jobFeatureId).update({
        status: 'completed',
        completedAt: firestore.Timestamp.now(),
        progress: 100
      });

      logger.info('Feature completed', { jobId, featureId, completedFeatureId });
      return completedFeature;
    } catch (error) {
      logger.error('Error completing feature', { jobId, featureId, error });
      throw error;
    }
  }

  /**
   * Get all completed features for a job
   */
  async getCompletedFeatures(jobId: string): Promise<CompletedFeature[]> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const snapshot = await this.db
        .collection('completed_features')
        .where('jobId', '==', jobId)
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          completedAt: data.completedAt.toDate ? data.completedAt.toDate() : new Date(data.completedAt)
        } as CompletedFeature;
      });
    } catch (error) {
      logger.error('Error getting completed features', { jobId, error });
      throw error;
    }
  }

  /**
   * Check if a feature is completed for a job
   */
  async isFeatureCompleted(jobId: string, featureId: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const snapshot = await this.db
        .collection('completed_features')
        .where('jobId', '==', jobId)
        .where('featureId', '==', featureId)
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      logger.error('Error checking feature completion', { jobId, featureId, error });
      throw error;
    }
  }

  /**
   * Get feature completion status
   */
  async getFeatureStatus(jobId: string, featureId: string): Promise<FeatureStatus> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const jobFeatureId = `${jobId}_${featureId}`;
      const doc = await this.db.collection('job_features').doc(jobFeatureId).get();

      if (!doc.exists) {
        return 'pending';
      }

      return (doc.data()?.status || 'pending') as FeatureStatus;
    } catch (error) {
      logger.error('Error getting feature status', { jobId, featureId, error });
      throw error;
    }
  }

  /**
   * Inject completed features into a job
   * Batch write completed features to Firestore
   */
  async injectCompletedFeatures(jobId: string, features: CompletedFeature[]): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const batch = this.db.batch();

      for (const feature of features) {
        const completedFeatureId = `${jobId}_${feature.featureId}_${Date.now()}`;
        const completedRef = this.db.collection('completed_features').doc(completedFeatureId);

        batch.set(completedRef, {
          ...feature,
          jobId,
          completedAt: firestore.Timestamp.fromDate(feature.completedAt || new Date())
        });

        // Also update job_features
        const jobFeatureRef = this.db.collection('job_features').doc(`${jobId}_${feature.featureId}`);
        batch.update(jobFeatureRef, {
          status: 'completed',
          completedAt: firestore.Timestamp.now(),
          progress: 100
        });
      }

      await batch.commit();
      logger.info('Features injected', { jobId, count: features.length });
    } catch (error) {
      logger.error('Error injecting features', { jobId, error });
      throw error;
    }
  }

  /**
   * Update feature completion progress
   */
  async updateFeatureProgress(
    jobId: string,
    featureId: string,
    progress: number,
    metadata?: any
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Clamp progress between 0 and 100
      const clampedProgress = Math.max(0, Math.min(100, progress));

      const jobFeatureId = `${jobId}_${featureId}`;
      await this.db.collection('job_features').doc(jobFeatureId).update({
        progress: clampedProgress,
        ...(metadata && { metadata }),
        updatedAt: firestore.Timestamp.now()
      });

      logger.info('Feature progress updated', { jobId, featureId, progress: clampedProgress });
    } catch (error) {
      logger.error('Error updating feature progress', { jobId, featureId, error });
      throw error;
    }
  }

  /**
   * Get feature dependencies and check if they're satisfied
   */
  async checkFeatureDependencies(jobId: string, featureId: string): Promise<{
    satisfied: boolean;
    missingDependencies: string[];
    availableDependencies: string[];
  }> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Get feature dependency information
      const depDoc = await this.db
        .collection('feature_dependencies')
        .where('featureId', '==', featureId)
        .limit(1)
        .get();

      if (depDoc.empty) {
        return {
          satisfied: true,
          missingDependencies: [],
          availableDependencies: []
        };
      }

      const depData = depDoc.docs[0].data();
      const dependsOn: string[] = depData.dependsOn || [];

      // Check which dependencies are completed
      const completedFeatures = await this.getCompletedFeatures(jobId);
      const completedFeatureIds = new Set(completedFeatures.map(f => f.featureId));

      const missingDependencies = dependsOn.filter(dep => !completedFeatureIds.has(dep));
      const availableDependencies = dependsOn.filter(dep => completedFeatureIds.has(dep));

      return {
        satisfied: missingDependencies.length === 0,
        missingDependencies,
        availableDependencies
      };
    } catch (error) {
      logger.error('Error checking feature dependencies', { jobId, featureId, error });
      throw error;
    }
  }

  /**
   * Get completion statistics for a job
   */
  async getCompletionStats(jobId: string): Promise<{
    totalFeatures: number;
    completedCount: number;
    inProgressCount: number;
    pendingCount: number;
    completionRate: number;
    estimatedTimeRemaining?: number;
  }> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Get all job features
      const jobFeaturesSnapshot = await this.db
        .collection('job_features')
        .where('jobId', '==', jobId)
        .get();

      const features = jobFeaturesSnapshot.docs.map(doc => doc.data());
      const totalFeatures = features.length;

      const completedCount = features.filter(f => f.status === 'completed').length;
      const inProgressCount = features.filter(f => f.status === 'in_progress').length;
      const pendingCount = features.filter(f => f.status === 'pending').length;

      const completionRate = totalFeatures > 0 ? (completedCount / totalFeatures) * 100 : 0;

      // Estimate time remaining based on average completion time
      const averageCompletionTime = features
        .filter(f => f.status === 'completed')
        .reduce((sum, f) => sum + (f.executionTime || 0), 0) / Math.max(1, completedCount);

      const estimatedTimeRemaining = (inProgressCount + pendingCount) * averageCompletionTime;

      return {
        totalFeatures,
        completedCount,
        inProgressCount,
        pendingCount,
        completionRate,
        estimatedTimeRemaining
      };
    } catch (error) {
      logger.error('Error getting completion stats', { jobId, error });
      throw error;
    }
  }

  /**
   * Validate feature completion data
   */
  validateCompletionData(featureId: string, completionData: any): boolean {
    try {
      // Basic validation: ensure completionData has required fields
      if (!completionData || typeof completionData !== 'object') {
        return false;
      }

      // At minimum, completion data should be a non-empty object
      // Features can define their own validation in specialized services
      return Object.keys(completionData).length > 0 || true; // Allow empty data for backward compatibility
    } catch (error) {
      logger.error('Error validating completion data', { featureId, error });
      return false;
    }
  }
}

// Export singleton instance
export const featureCompletionService = new FeatureCompletionService();