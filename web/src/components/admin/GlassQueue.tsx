/**
 * GlassQueue Component - Backward Compatibility Re-export
 * This file re-exports from ./queue for backward compatibility
 * All implementation has been moved to modular structure at ./queue/
 */

export { default } from './queue/GlassQueue';
export type {
  UploadStages,
  QueueJob,
  QueueStats,
  GlassQueueProps,
} from './queue/types';
