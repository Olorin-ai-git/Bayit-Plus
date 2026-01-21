/**
 * Job Feature Service
 *
 * Service for managing job features, including updates, status changes,
 * and feature lifecycle management within workflows.
 *
 * @author CVPlus Team
 * @version 1.0.0
 * @created 2025-11-29
  */

import { logger } from 'firebase-functions';
import { firestore } from 'firebase-admin';
import { Feature, FeatureStatus, FeatureDependency } from '../../types/Feature';
import { Job } from '../../types/Job';

export class JobFeatureService {
  private db: firestore.Firestore | null = null;

  /**
   * Initialize with Firestore instance
   * @param firestoreInstance - The Firestore instance to use for database operations
   */
  initialize(firestoreInstance: firestore.Firestore): void {
    this.db = firestoreInstance;
  }

  /**
   * Get all features for a job
   * @param jobId - The job ID
   * @returns Array of features associated with the job
   */
  async getJobFeatures(jobId: string): Promise<Feature[]> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const snapshot = await this.db
        .collection('job_features')
        .where('jobId', '==', jobId)
        .get();

      const features: Feature[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();

        // Fetch full feature details from features collection
        const featureDoc = await this.db.collection('features').doc(data.featureId).get();

        if (featureDoc.exists) {
          const featureData = featureDoc.data()!;
          features.push({
            id: featureData.id,
            name: featureData.name,
            description: featureData.description,
            category: featureData.category,
            status: data.status || 'pending',
            priority: featureData.priority || 'medium',
            estimatedDuration: featureData.estimatedDuration,
            dependencies: featureData.dependencies || [],
            progress: data.progress || 0,
            metadata: data.metadata,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          });
        }
      }

      logger.info('Retrieved job features', { jobId, count: features.length });
      return features;
    } catch (error) {
      logger.error('Error getting job features', { jobId, error });
      throw error;
    }
  }

  /**
   * Add a new feature to a job
   * @param jobId - The job ID
   * @param feature - The feature to add
   */
  async addFeatureToJob(jobId: string, feature: Feature): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const jobFeatureId = `${jobId}_${feature.id}`;
      const timestamp = firestore.Timestamp.now();

      await this.db.collection('job_features').doc(jobFeatureId).set({
        jobId,
        featureId: feature.id,
        status: 'pending',
        progress: 0,
        startedAt: null,
        completedAt: null,
        metadata: feature.metadata || {},
        createdAt: timestamp,
        updatedAt: timestamp
      });

      logger.info('Added feature to job', { jobId, featureId: feature.id });
    } catch (error) {
      logger.error('Error adding feature to job', { jobId, featureId: feature.id, error });
      throw error;
    }
  }

  /**
   * Remove a feature from a job
   * @param jobId - The job ID
   * @param featureId - The feature ID to remove
   */
  async removeFeatureFromJob(jobId: string, featureId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const jobFeatureId = `${jobId}_${featureId}`;
      await this.db.collection('job_features').doc(jobFeatureId).delete();

      logger.info('Removed feature from job', { jobId, featureId });
    } catch (error) {
      logger.error('Error removing feature from job', { jobId, featureId, error });
      throw error;
    }
  }

  /**
   * Update feature metadata for a job
   * @param jobId - The job ID
   * @param featureId - The feature ID
   * @param metadata - The metadata to update
   */
  async updateFeatureMetadata(
    jobId: string,
    featureId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const jobFeatureId = `${jobId}_${featureId}`;
      await this.db.collection('job_features').doc(jobFeatureId).update({
        metadata,
        updatedAt: firestore.Timestamp.now()
      });

      logger.info('Updated feature metadata', { jobId, featureId });
    } catch (error) {
      logger.error('Error updating feature metadata', { jobId, featureId, error });
      throw error;
    }
  }

  /**
   * Get feature metadata for a job
   * @param jobId - The job ID
   * @param featureId - The feature ID
   * @returns The feature metadata or null if not found
   */
  async getFeatureMetadata(jobId: string, featureId: string): Promise<Record<string, any> | null> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const jobFeatureId = `${jobId}_${featureId}`;
      const doc = await this.db.collection('job_features').doc(jobFeatureId).get();

      if (!doc.exists) {
        return null;
      }

      return doc.data()?.metadata || null;
    } catch (error) {
      logger.error('Error getting feature metadata', { jobId, featureId, error });
      throw error;
    }
  }

  /**
   * Get feature statistics for a job
   * @param jobId - The job ID
   * @returns Statistics about job features
   */
  async getJobFeatureStats(jobId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
  }> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const snapshot = await this.db
        .collection('job_features')
        .where('jobId', '==', jobId)
        .get();

      const stats = {
        total: snapshot.size,
        completed: 0,
        pending: 0,
        in_progress: 0
      };

      snapshot.docs.forEach(doc => {
        const status = doc.data().status;
        if (status === 'completed') {
          stats.completed++;
        } else if (status === 'processing' || status === 'in_progress') {
          stats.in_progress++;
        } else if (status === 'pending') {
          stats.pending++;
        }
      });

      logger.info('Retrieved job feature stats', { jobId, stats });
      return stats;
    } catch (error) {
      logger.error('Error getting job feature stats', { jobId, error });
      throw error;
    }
  }

  /**
   * Filter job features by criteria
   * @param jobId - The job ID
   * @param filters - Filter criteria
   * @returns Filtered array of features
   */
  async filterJobFeatures(
    jobId: string,
    filters: {
      status?: FeatureStatus;
      priority?: 'low' | 'medium' | 'high';
      category?: string;
    }
  ): Promise<Feature[]> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      let query = this.db.collection('job_features').where('jobId', '==', jobId);

      if (filters.status) {
        query = query.where('status', '==', filters.status) as firestore.Query;
      }

      const snapshot = await query.get();
      const features: Feature[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const featureDoc = await this.db.collection('features').doc(data.featureId).get();

        if (featureDoc.exists) {
          const featureData = featureDoc.data()!;

          // Apply additional filters on feature data
          if (filters.priority && featureData.priority !== filters.priority) {
            continue;
          }
          if (filters.category && featureData.category !== filters.category) {
            continue;
          }

          features.push({
            id: featureData.id,
            name: featureData.name,
            description: featureData.description,
            category: featureData.category,
            status: data.status,
            priority: featureData.priority,
            estimatedDuration: featureData.estimatedDuration,
            dependencies: featureData.dependencies || [],
            progress: data.progress,
            metadata: data.metadata,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          });
        }
      }

      logger.info('Filtered job features', { jobId, filters, count: features.length });
      return features;
    } catch (error) {
      logger.error('Error filtering job features', { jobId, error });
      throw error;
    }
  }

  /**
   * Get feature execution order based on dependencies
   * @param jobId - The job ID
   * @returns Features ordered by dependency resolution
   */
  async getFeatureExecutionOrder(jobId: string): Promise<Feature[]> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const features = await this.getJobFeatures(jobId);

      // Topological sort based on dependencies
      const ordered: Feature[] = [];
      const visited = new Set<string>();
      const visiting = new Set<string>();

      const visit = (feature: Feature) => {
        if (visited.has(feature.id)) {
          return;
        }

        if (visiting.has(feature.id)) {
          throw new Error(`Circular dependency detected: ${feature.id}`);
        }

        visiting.add(feature.id);

        // Visit dependencies first
        for (const depId of feature.dependencies) {
          const depFeature = features.find(f => f.id === depId);
          if (depFeature) {
            visit(depFeature);
          }
        }

        visiting.delete(feature.id);
        visited.add(feature.id);
        ordered.push(feature);
      };

      // Visit all features
      for (const feature of features) {
        visit(feature);
      }

      logger.info('Calculated feature execution order', { jobId, count: ordered.length });
      return ordered;
    } catch (error) {
      logger.error('Error getting feature execution order', { jobId, error });
      throw error;
    }
  }

  /**
   * Validate feature set for a job
   * @param jobId - The job ID
   * @returns Validation result
   */
  async validateFeatureSet(jobId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const features = await this.getJobFeatures(jobId);
      const errors: string[] = [];
      const warnings: string[] = [];

      const featureIds = new Set(features.map(f => f.id));

      // Check for missing dependencies
      for (const feature of features) {
        for (const depId of feature.dependencies) {
          if (!featureIds.has(depId)) {
            errors.push(`Feature ${feature.id} depends on missing feature ${depId}`);
          }
        }
      }

      // Check for circular dependencies
      try {
        await this.getFeatureExecutionOrder(jobId);
      } catch (error: any) {
        if (error.message.includes('Circular dependency')) {
          errors.push(error.message);
        }
      }

      // Check for incompatible features
      const incompatibilityResult = await this.checkFeatureCompatibility(jobId, features);
      errors.push(...incompatibilityResult.errors);
      warnings.push(...incompatibilityResult.warnings);

      const valid = errors.length === 0;

      logger.info('Validated feature set', { jobId, valid, errorCount: errors.length });
      return { valid, errors, warnings };
    } catch (error) {
      logger.error('Error validating feature set', { jobId, error });
      throw error;
    }
  }

  /**
   * Check feature compatibility
   * @param jobId - The job ID
   * @param features - Features to check
   * @returns Compatibility result
   */
  async checkFeatureCompatibility(
    jobId: string,
    features: Feature[]
  ): Promise<{
    compatible: boolean;
    errors: string[];
    warnings: string[];
  }> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // This is a placeholder for feature compatibility logic
      // In a real implementation, you would check feature metadata for compatibility rules

      // Example: Check if multiple features of the same category conflict
      const categoryGroups = new Map<string, Feature[]>();
      for (const feature of features) {
        if (!categoryGroups.has(feature.category)) {
          categoryGroups.set(feature.category, []);
        }
        categoryGroups.get(feature.category)!.push(feature);
      }

      // Example warning: Multiple export features
      if (categoryGroups.has('export') && categoryGroups.get('export')!.length > 3) {
        warnings.push('Multiple export features selected - this may increase processing time');
      }

      const compatible = errors.length === 0;

      logger.info('Checked feature compatibility', { jobId, compatible });
      return { compatible, errors, warnings };
    } catch (error) {
      logger.error('Error checking feature compatibility', { jobId, error });
      throw error;
    }
  }

  /**
   * Optimize feature execution order
   * @param jobId - The job ID
   * @returns Optimized feature execution plan
   */
  async optimizeFeatureExecution(jobId: string): Promise<{
    executionGroups: Feature[][];
    estimatedTotalTime: number;
    optimizationNotes: string[];
  }> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const orderedFeatures = await this.getFeatureExecutionOrder(jobId);
      const executionGroups: Feature[][] = [];
      const optimizationNotes: string[] = [];

      // Group features that can run in parallel
      const completed = new Set<string>();
      let currentGroup: Feature[] = [];

      for (const feature of orderedFeatures) {
        // Check if all dependencies are completed
        const canExecute = feature.dependencies.every(dep => completed.has(dep));

        if (canExecute && currentGroup.length === 0) {
          // Start new group
          currentGroup.push(feature);
        } else if (canExecute && currentGroup.length > 0) {
          // Check if this can be added to current group (parallel execution)
          const hasConflict = currentGroup.some(f =>
            f.dependencies.includes(feature.id) || feature.dependencies.includes(f.id)
          );

          if (!hasConflict) {
            currentGroup.push(feature);
            optimizationNotes.push(`Feature ${feature.id} can run in parallel with group`);
          } else {
            // Finish current group and start new one
            executionGroups.push([...currentGroup]);
            currentGroup.forEach(f => completed.add(f.id));
            currentGroup = [feature];
          }
        } else {
          // Dependencies not met, finish current group
          if (currentGroup.length > 0) {
            executionGroups.push([...currentGroup]);
            currentGroup.forEach(f => completed.add(f.id));
            currentGroup = [];
          }
          currentGroup.push(feature);
        }
      }

      // Add final group
      if (currentGroup.length > 0) {
        executionGroups.push(currentGroup);
      }

      // Calculate estimated total time
      const estimatedTotalTime = executionGroups.reduce((total, group) => {
        const groupTime = Math.max(...group.map(f => f.estimatedDuration || 0));
        return total + groupTime;
      }, 0);

      logger.info('Optimized feature execution', {
        jobId,
        groups: executionGroups.length,
        estimatedTotalTime
      });

      return {
        executionGroups,
        estimatedTotalTime,
        optimizationNotes
      };
    } catch (error) {
      logger.error('Error optimizing feature execution', { jobId, error });
      throw error;
    }
  }

  /**
   * Update features for a specific job
   * @param jobId - The job ID
   * @param featureUpdates - Array of feature updates
   */
  async updateJobFeatures(jobId: string, featureUpdates: Partial<Feature>[]): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const batch = this.db.batch();
      const timestamp = firestore.Timestamp.now();

      for (const update of featureUpdates) {
        if (!update.id) {
          throw new Error('Feature ID is required for updates');
        }

        const jobFeatureId = `${jobId}_${update.id}`;
        const ref = this.db.collection('job_features').doc(jobFeatureId);

        const updateData: any = {
          updatedAt: timestamp
        };

        if (update.status) {
          updateData.status = update.status;
        }
        if (update.progress !== undefined) {
          updateData.progress = update.progress;
        }
        if (update.metadata) {
          updateData.metadata = update.metadata;
        }

        batch.update(ref, updateData);
      }

      await batch.commit();
      logger.info('Updated job features', { jobId, count: featureUpdates.length });
    } catch (error) {
      logger.error('Error updating job features', { jobId, error });
      throw error;
    }
  }

  /**
   * Update a specific feature's status
   * @param jobId - The job ID
   * @param featureId - The feature ID
   * @param status - The new status
   */
  async updateFeatureStatus(
    jobId: string,
    featureId: string,
    status: FeatureStatus
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const jobFeatureId = `${jobId}_${featureId}`;
      const updateData: any = {
        status,
        updatedAt: firestore.Timestamp.now()
      };

      if (status === 'processing') {
        updateData.startedAt = firestore.Timestamp.now();
      } else if (status === 'completed') {
        updateData.completedAt = firestore.Timestamp.now();
        updateData.progress = 100;
      }

      await this.db.collection('job_features').doc(jobFeatureId).update(updateData);

      logger.info('Updated feature status', { jobId, featureId, status });
    } catch (error) {
      logger.error('Error updating feature status', { jobId, featureId, error });
      throw error;
    }
  }

  /**
   * Get feature by ID within a job
   * @param jobId - The job ID
   * @param featureId - The feature ID
   * @returns The feature or null if not found
   */
  async getFeature(jobId: string, featureId: string): Promise<Feature | null> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const jobFeatureId = `${jobId}_${featureId}`;
      const jobFeatureDoc = await this.db.collection('job_features').doc(jobFeatureId).get();

      if (!jobFeatureDoc.exists) {
        return null;
      }

      const jobFeatureData = jobFeatureDoc.data()!;
      const featureDoc = await this.db.collection('features').doc(featureId).get();

      if (!featureDoc.exists) {
        return null;
      }

      const featureData = featureDoc.data()!;

      return {
        id: featureData.id,
        name: featureData.name,
        description: featureData.description,
        category: featureData.category,
        status: jobFeatureData.status,
        priority: featureData.priority,
        estimatedDuration: featureData.estimatedDuration,
        dependencies: featureData.dependencies || [],
        progress: jobFeatureData.progress,
        metadata: jobFeatureData.metadata,
        createdAt: jobFeatureData.createdAt?.toDate() || new Date(),
        updatedAt: jobFeatureData.updatedAt?.toDate() || new Date()
      };
    } catch (error) {
      logger.error('Error getting feature', { jobId, featureId, error });
      throw error;
    }
  }

  /**
   * Bulk update feature properties
   * @param jobId - The job ID
   * @param updates - Array of feature updates with IDs
   */
  async bulkUpdateFeatures(
    jobId: string,
    updates: Array<{
      featureId: string;
      updates: Partial<Feature>;
    }>
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const batch = this.db.batch();
      const timestamp = firestore.Timestamp.now();

      for (const { featureId, updates: featureUpdates } of updates) {
        const jobFeatureId = `${jobId}_${featureId}`;
        const ref = this.db.collection('job_features').doc(jobFeatureId);

        const updateData: any = {
          updatedAt: timestamp
        };

        if (featureUpdates.status) {
          updateData.status = featureUpdates.status;
        }
        if (featureUpdates.progress !== undefined) {
          updateData.progress = featureUpdates.progress;
        }
        if (featureUpdates.metadata) {
          updateData.metadata = featureUpdates.metadata;
        }

        batch.update(ref, updateData);
      }

      await batch.commit();
      logger.info('Bulk updated features', { jobId, count: updates.length });
    } catch (error) {
      logger.error('Error bulk updating features', { jobId, error });
      throw error;
    }
  }

  /**
   * Get features by status
   * @param jobId - The job ID
   * @param status - The status to filter by
   * @returns Features with the specified status
   */
  async getFeaturesByStatus(jobId: string, status: FeatureStatus): Promise<Feature[]> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      return await this.filterJobFeatures(jobId, { status });
    } catch (error) {
      logger.error('Error getting features by status', { jobId, status, error });
      throw error;
    }
  }

  /**
   * Validate feature updates
   * @param updates - Array of feature updates to validate
   * @returns Validation result
   */
  validateFeatureUpdates(updates: Partial<Feature>[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const update of updates) {
      if (!update.id) {
        errors.push('Feature update missing required field: id');
      }

      if (update.progress !== undefined) {
        if (update.progress < 0 || update.progress > 100) {
          errors.push(`Invalid progress value for feature ${update.id}: ${update.progress}`);
        }
      }

      if (update.status) {
        const validStatuses: FeatureStatus[] = ['pending', 'processing', 'completed', 'skipped', 'failed', 'blocked'];
        if (!validStatuses.includes(update.status)) {
          errors.push(`Invalid status for feature ${update.id}: ${update.status}`);
        }
      }

      if (update.priority) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(update.priority)) {
          errors.push(`Invalid priority for feature ${update.id}: ${update.priority}`);
        }
      }
    }

    const valid = errors.length === 0;
    logger.info('Validated feature updates', { valid, errorCount: errors.length });

    return { valid, errors };
  }

  /**
   * Get feature statistics for a job
   * @param jobId - The job ID
   * @returns Detailed feature statistics
   */
  async getFeatureStatistics(jobId: string): Promise<{
    totalFeatures: number;
    featuresByStatus: Record<FeatureStatus, number>;
    averageExecutionTime: number;
    mostTimeConsumingFeatures: Array<{
      featureId: string;
      executionTime: number;
    }>;
  }> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const snapshot = await this.db
        .collection('job_features')
        .where('jobId', '==', jobId)
        .get();

      const featuresByStatus: Record<FeatureStatus, number> = {
        pending: 0,
        processing: 0,
        completed: 0,
        skipped: 0,
        failed: 0,
        blocked: 0
      };

      let totalExecutionTime = 0;
      let completedCount = 0;
      const executionTimes: Array<{ featureId: string; executionTime: number }> = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const status = data.status as FeatureStatus;

        featuresByStatus[status] = (featuresByStatus[status] || 0) + 1;

        if (data.startedAt && data.completedAt) {
          const executionTime = data.completedAt.toMillis() - data.startedAt.toMillis();
          totalExecutionTime += executionTime;
          completedCount++;
          executionTimes.push({
            featureId: data.featureId,
            executionTime
          });
        }
      });

      const averageExecutionTime = completedCount > 0 ? totalExecutionTime / completedCount : 0;

      const mostTimeConsumingFeatures = executionTimes
        .sort((a, b) => b.executionTime - a.executionTime)
        .slice(0, 5);

      logger.info('Retrieved feature statistics', {
        jobId,
        totalFeatures: snapshot.size,
        averageExecutionTime
      });

      return {
        totalFeatures: snapshot.size,
        featuresByStatus,
        averageExecutionTime,
        mostTimeConsumingFeatures
      };
    } catch (error) {
      logger.error('Error getting feature statistics', { jobId, error });
      throw error;
    }
  }
}

// Export singleton instance
export const jobFeatureService = new JobFeatureService();