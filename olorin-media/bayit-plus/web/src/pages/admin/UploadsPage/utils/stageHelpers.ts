/**
 * Upload stage utilities
 * Helpers for managing upload stage states and transitions
 */

import type { UploadStageState, UploadStageStatus } from '../types';
import { UPLOAD_STAGE_LABELS, UPLOAD_STAGE_ICONS } from '../constants';

/**
 * Creates initial stage state (all pending)
 */
export const createInitialStageState = (): UploadStageState => ({
  browserUpload: 'pending',
  hashCalculation: 'pending',
  duplicateCheck: 'pending',
  metadataExtraction: 'pending',
  gcsUpload: 'pending',
  databaseInsert: 'pending',
});

/**
 * Gets the current active stage based on state
 */
export const getCurrentStage = (stages: UploadStageState): string | null => {
  if (stages.browserUpload === 'in_progress') return 'browserUpload';
  if (stages.hashCalculation === 'in_progress') return 'hashCalculation';
  if (stages.duplicateCheck === 'in_progress') return 'duplicateCheck';
  if (stages.metadataExtraction === 'in_progress') return 'metadataExtraction';
  if (stages.gcsUpload === 'in_progress') return 'gcsUpload';
  if (stages.databaseInsert === 'in_progress') return 'databaseInsert';
  return null;
};

/**
 * Checks if all stages are completed
 */
export const areAllStagesCompleted = (stages: UploadStageState): boolean => {
  return Object.values(stages).every((status) => status === 'completed');
};

/**
 * Checks if any stage has failed
 */
export const hasAnyStagesFailed = (stages: UploadStageState): boolean => {
  return Object.values(stages).some((status) => status === 'failed');
};

/**
 * Gets overall progress percentage based on stages
 */
export const getOverallProgress = (stages: UploadStageState): number => {
  const stageKeys = Object.keys(stages) as (keyof UploadStageState)[];
  const totalStages = stageKeys.length;
  let completedStages = 0;

  stageKeys.forEach((key) => {
    if (stages[key] === 'completed') completedStages++;
    else if (stages[key] === 'in_progress') completedStages += 0.5;
  });

  return (completedStages / totalStages) * 100;
};

/**
 * Gets stage label translation key
 */
export const getStageLabel = (stageKey: string): string => {
  return UPLOAD_STAGE_LABELS[stageKey] || stageKey;
};

/**
 * Gets stage icon emoji
 */
export const getStageIcon = (stageKey: string): string => {
  return UPLOAD_STAGE_ICONS[stageKey] || '•';
};
