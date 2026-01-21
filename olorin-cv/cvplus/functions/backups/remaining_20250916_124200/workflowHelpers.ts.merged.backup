// @ts-ignore - Export conflicts/**
 * Workflow helper functions for the CVPlus Workflow module
 */

import { Job, JobStatus, JobProgress, WorkflowState } from '../types/Job';
import { Feature, FeatureStatus } from '../types/Feature';

/**
 * Calculate job progress based on features
 */
export const calculateJobProgress = (features: Feature[]): JobProgress => {
  const totalFeatures = features.length;
  const completedFeatures = features.filter(f => f.status === 'completed').length;
  const skippedFeatures = features.filter(f => f.status === 'skipped').length;
  const remainingFeatures = totalFeatures - completedFeatures - skippedFeatures;
  const progressPercentage = totalFeatures > 0 ? ((completedFeatures + skippedFeatures) / totalFeatures) * 100 : 0;

  return {
    totalFeatures,
    completedFeatures,
    skippedFeatures,
    remainingFeatures,
    progressPercentage: Math.round(progressPercentage * 100) / 100
  };
};

/**
 * Determine job status based on features
 */
export const determineJobStatus = (features: Feature[]): JobStatus => {
  if (features.length === 0) return 'pending';
  
  const hasProcessingFeatures = features.some(f => f.status === 'processing');
  const hasFailedFeatures = features.some(f => f.status === 'failed');
  const allCompleted = features.every(f => f.status === 'completed' || f.status === 'skipped');
  
  if (hasFailedFeatures) return 'failed';
  if (allCompleted) return 'completed';
  if (hasProcessingFeatures) return 'processing';
  
  return 'pending';
};

/**
 * Check if a feature can be executed based on dependencies
 */
export const canExecuteFeature = (feature: Feature, completedFeatures: string[]): boolean => {
  return feature.dependencies.every(depId => completedFeatures.includes(depId));
};

/**
 * Get next executable features based on dependencies
 */
export const getNextExecutableFeatures = (
  features: Feature[], 
  completedFeatureIds: string[]
): Feature[] => {
  return features
    .filter(f => f.status === 'pending')
    .filter(f => canExecuteFeature(f, completedFeatureIds))
    .sort((a, b) => {
      // Sort by priority (high to low), then by dependencies count (fewer first)
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return a.dependencies.length - b.dependencies.length;
    });
};

/**
 * Validate feature dependencies
 */
export const validateFeatureDependencies = (features: Feature[]): {
  valid: boolean;
  errors: string[];
  circularDependencies: string[][];
} => {
  const errors: string[] = [];
  const circularDependencies: string[][] = [];
  const featureIds = new Set(features.map(f => f.id));
  
  // Check if all dependencies exist
  for (const feature of features) {
    for (const depId of feature.dependencies) {
      if (!featureIds.has(depId)) {
        errors.push(`Feature "${feature.name}" depends on non-existent feature "${depId}"`);
      }
    }
  }
  
  // Check for circular dependencies using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  const detectCircularDependency = (featureId: string, path: string[]): boolean => {
    if (recursionStack.has(featureId)) {
      const cycleStart = path.indexOf(featureId);
      circularDependencies.push(path.slice(cycleStart).concat([featureId]));
      return true;
    }
    
    if (visited.has(featureId)) return false;
    
    visited.add(featureId);
    recursionStack.add(featureId);
    
    const feature = features.find(f => f.id === featureId);
    if (feature) {
      for (const depId of feature.dependencies) {
        if (detectCircularDependency(depId, [...path, featureId])) {
          return true;
        }
      }
    }
    
    recursionStack.delete(featureId);
    return false;
  };
  
  for (const feature of features) {
    if (!visited.has(feature.id)) {
      detectCircularDependency(feature.id, []);
    }
  }
  
  return {
    valid: errors.length === 0 && circularDependencies.length === 0,
    errors,
    circularDependencies
  };
};

/**
 * Estimate completion time for a job
 */
export const estimateCompletionTime = (features: Feature[]): Date | null => {
  const pendingFeatures = features.filter(f => f.status === 'pending');
  if (pendingFeatures.length === 0) return null;
  
  const totalEstimatedDuration = pendingFeatures.reduce((sum, feature) => {
    return sum + (feature.estimatedDuration || 10); // Default 10 minutes if not specified
  }, 0);
  
  const now = new Date();
  return new Date(now.getTime() + totalEstimatedDuration * 60 * 1000);
};

/**
 * Calculate workflow completion percentage
 */
export const calculateWorkflowCompletion = (workflowState: WorkflowState): number => {
  const { totalSteps, completedSteps } = workflowState;
  if (totalSteps === 0) return 0;
  return (completedSteps / totalSteps) * 100;
};

/**
 * Check if workflow is blocked
 */
export const isWorkflowBlocked = (workflowState: WorkflowState): boolean => {
  return workflowState.blockedSteps.length > 0 && workflowState.nextSteps.length === 0;
};

/**
 * Get workflow bottlenecks
 */
export const getWorkflowBottlenecks = (features: Feature[]): Feature[] => {
  return features
    .filter(f => f.status === 'processing')
    .filter(f => {
      const dependents = features.filter(df => df.dependencies.includes(f.id));
      return dependents.length > 2; // Features with many dependents
    })
    .sort((a, b) => {
      const aDependents = features.filter(f => f.dependencies.includes(a.id)).length;
      const bDependents = features.filter(f => f.dependencies.includes(b.id)).length;
      return bDependents - aDependents;
    });
};

/**
 * Generate feature execution plan
 */
export const generateExecutionPlan = (features: Feature[]): Array<{
  phase: number;
  features: Feature[];
}> => {
  const plan: Array<{ phase: number; features: Feature[] }> = [];
  const completed = new Set<string>();
  const remaining = [...features];
  let phase = 1;
  
  while (remaining.length > 0) {
    const executableThisPhase = remaining.filter(f => 
      canExecuteFeature(f, Array.from(completed))
    );
    
    if (executableThisPhase.length === 0) {
      // Handle circular dependencies or missing dependencies
      break;
    }
    
    plan.push({
      phase,
      features: executableThisPhase
    });
    
    // Mark these features as completed for next phase planning
    executableThisPhase.forEach(f => {
      completed.add(f.id);
      const index = remaining.findIndex(rf => rf.id === f.id);
      if (index !== -1) remaining.splice(index, 1);
    });
    
    phase++;
  }
  
  return plan;
};

/**
 * Format duration for display
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Generate workflow summary
 */
export const generateWorkflowSummary = (job: Job, features: Feature[]): {
  status: JobStatus;
  progress: JobProgress;
  estimatedCompletion: Date | null;
  nextActions: string[];
  issues: string[];
} => {
  const status = determineJobStatus(features);
  const progress = calculateJobProgress(features);
  const estimatedCompletion = estimateCompletionTime(features);
  
  const nextActions: string[] = [];
  const issues: string[] = [];
  
  // Generate next actions
  const nextFeatures = getNextExecutableFeatures(features, features.filter(f => f.status === 'completed').map(f => f.id));
  if (nextFeatures.length > 0) {
    nextActions.push(`Execute ${nextFeatures.length} ready feature${nextFeatures.length > 1 ? 's' : ''}`);
  }
  
  // Identify issues
  const failedFeatures = features.filter(f => f.status === 'failed');
  if (failedFeatures.length > 0) {
    issues.push(`${failedFeatures.length} feature${failedFeatures.length > 1 ? 's' : ''} failed`);
  }
  
  const blockedFeatures = features.filter(f => f.status === 'blocked');
  if (blockedFeatures.length > 0) {
    issues.push(`${blockedFeatures.length} feature${blockedFeatures.length > 1 ? 's are' : ' is'} blocked`);
  }
  
  return {
    status,
    progress,
    estimatedCompletion,
    nextActions,
    issues
  };
};