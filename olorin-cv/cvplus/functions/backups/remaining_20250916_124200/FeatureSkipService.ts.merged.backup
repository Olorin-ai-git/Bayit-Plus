// @ts-ignore - Export conflicts/**
 * Feature Skip Service
 * 
 * Service for managing feature skipping functionality within job workflows,
 * handling skip reasons, and updating workflow state accordingly.
 */

import { Feature, FeatureStatus, SkippedFeature } from '../../types/Feature';

export class FeatureSkipService {

  /**
   * Skip a feature in a job workflow
   */
  async skipFeature(
    jobId: string, 
    featureId: string, 
    reason?: string, 
    skipMetadata?: any
  ): Promise<SkippedFeature> {
    // TODO: Implement feature skip logic
    throw new Error('Method not implemented - pending migration');
  }

  /**
   * Get all skipped features for a job
   */
  async getSkippedFeatures(jobId: string): Promise<SkippedFeature[]> {
    // TODO: Implement skipped features retrieval
    throw new Error('Method not implemented - pending migration');
  }

  /**
   * Check if a feature is skipped for a job
   */
  async isFeatureSkipped(jobId: string, featureId: string): Promise<boolean> {
    // TODO: Implement feature skip check
    throw new Error('Method not implemented - pending migration');
  }

  /**
   * Unskip a feature (mark as available again)
   */
  async unskipFeature(jobId: string, featureId: string): Promise<void> {
    // TODO: Implement feature unskip logic
    throw new Error('Method not implemented - pending migration');
  }

  /**
   * Get skip reasons for analytics
   */
  async getSkipReasons(jobId?: string): Promise<{
    reason: string;
    count: number;
    percentage: number;
  }[]> {
    // TODO: Implement skip reasons analytics
    throw new Error('Method not implemented - pending migration');
  }

  /**
   * Check if feature can be skipped
   */
  async canSkipFeature(jobId: string, featureId: string): Promise<{
    canSkip: boolean;
    reason?: string;
    dependencies?: string[];
  }> {
    // TODO: Implement skip eligibility check
    throw new Error('Method not implemented - pending migration');
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
    // TODO: Implement intelligent skip suggestions
    throw new Error('Method not implemented - pending migration');
  }

  /**
   * Update skip reason for an already skipped feature
   */
  async updateSkipReason(
    jobId: string, 
    featureId: string, 
    newReason: string
  ): Promise<void> {
    // TODO: Implement skip reason updates
    throw new Error('Method not implemented - pending migration');
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
    // TODO: Implement skip impact analysis
    throw new Error('Method not implemented - pending migration');
  }
}