// @ts-ignore - Export conflicts/**
 * Processor Types
 * 
 * Type definitions for multimedia processors.
 * 
 * @author Gil Klainert
 * @version 1.0.0 - CVPlus Multimedia Module
 */

export interface ProcessorConfig {
  concurrency?: number;
  timeout?: number;
  quality?: 'low' | 'medium' | 'high';
  priority?: 'low' | 'normal' | 'high';
}

export interface ProcessingPipeline {
  stages: ProcessingStage[];
  parallel?: boolean;
  onProgress?: (progress: number) => void;
  onError?: (error: Error, stage: string) => void;
}

export interface ProcessingStage {
  name: string;
  processor: string;
  options: Record<string, any>;
  required?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  data?: any;
  metadata?: Record<string, any>;
  errors?: Error[];
  processingTime?: number;
  stages?: StageResult[];
}

export interface StageResult {
  stage: string;
  success: boolean;
  data?: any;
  error?: Error;
  duration?: number;
}