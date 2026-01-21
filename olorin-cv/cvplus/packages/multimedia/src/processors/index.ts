/**
 * Multimedia Processors
 * 
 * High-level media processing interfaces that orchestrate
 * various multimedia operations.
 * 
 * @author Gil Klainert
 * @version 1.0.0 - CVPlus Multimedia Module
  */

export { ImageProcessor } from './ImageProcessor';
export { VideoProcessor } from './VideoProcessor';
export { AudioProcessor } from './AudioProcessor';
export { MediaProcessor } from './MediaProcessor';

// Re-export processor-specific types
export type {
  ProcessorConfig,
  ProcessingPipeline,
  ProcessingStage,
  ProcessingResult
} from './types';