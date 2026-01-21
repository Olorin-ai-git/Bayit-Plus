// @ts-ignore - Export conflicts/**
 * Feature-related type definitions for the CVPlus Workflow module
 */

export type FeatureStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'skipped'
  | 'failed'
  | 'blocked';

export type FeatureCategory = 
  | 'content'
  | 'multimedia'
  | 'design'
  | 'analysis'
  | 'optimization'
  | 'export'
  | 'sharing';

export interface Feature {
  id: string;
  name: string;
  description?: string;
  category: FeatureCategory;
  status: FeatureStatus;
  priority: 'low' | 'medium' | 'high';
  estimatedDuration?: number; // in minutes
  dependencies: string[]; // Array of feature IDs this feature depends on
  progress?: number; // 0-100
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompletedFeature {
  id: string;
  jobId: string;
  name: string;
  status: 'completed';
  completedAt: Date;
  completionData: any;
  completedBy: string; // User ID
  executionTime?: number; // in milliseconds
  quality?: number; // 0-100 quality score
  metadata?: Record<string, any>;
}

export interface SkippedFeature {
  id: string;
  jobId: string;
  name: string;
  status: 'skipped';
  skippedAt: Date;
  skipReason?: string;
  skippedBy: string; // User ID
  impactAssessment?: {
    dependentFeatures: string[];
    qualityImpact: number; // 0-100
    completionImpact: number; // 0-100
  };
  metadata?: Record<string, any>;
}

export interface FeatureDependency {
  featureId: string;
  dependsOn: string;
  dependencyType: 'required' | 'optional' | 'enhancement';
  description?: string;
}

export interface FeatureExecution {
  featureId: string;
  jobId: string;
  startedAt: Date;
  completedAt?: Date;
  status: FeatureStatus;
  attempts: number;
  lastError?: string;
  executionTime?: number;
  resourceUsage?: {
    cpu: number;
    memory: number;
    storage: number;
  };
}

export interface FeatureConfiguration {
  featureId: string;
  settings: Record<string, any>;
  enabled: boolean;
  version: string;
  customizations?: Record<string, any>;
}

export interface FeatureStatistics {
  totalFeatures: number;
  featuresByCategory: Record<FeatureCategory, number>;
  featuresByStatus: Record<FeatureStatus, number>;
  averageExecutionTime: number;
  successRate: number;
  mostUsedFeatures: Array<{
    featureId: string;
    name: string;
    usageCount: number;
  }>;
  mostSkippedFeatures: Array<{
    featureId: string;
    name: string;
    skipCount: number;
    commonReasons: string[];
  }>;
}