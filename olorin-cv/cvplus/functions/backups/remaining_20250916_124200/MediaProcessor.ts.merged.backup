// @ts-ignore - Export conflicts/**
 * Media Processor
 * 
 * Base class for all media processors providing common functionality
 * and processing pipeline orchestration.
 * 
 * @author Gil Klainert
 * @version 1.0.0 - CVPlus Multimedia Module
 */

import { ProcessorConfig, ProcessingPipeline, ProcessingResult, ProcessingStage, StageResult } from './types';

export abstract class MediaProcessor {
  protected config: ProcessorConfig;
  
  constructor(config: ProcessorConfig = {}) {
    this.config = {
      concurrency: 3,
      timeout: 30000,
      quality: 'medium',
      priority: 'normal',
      ...config
    };
  }

  /**
   * Process media through a pipeline of stages
   */
  async processPipeline(pipeline: ProcessingPipeline, input: any): Promise<ProcessingResult> {
    const startTime = Date.now();
    const results: StageResult[] = [];
    let currentData = input;

    try {
      for (const stage of pipeline.stages) {
        const stageStart = Date.now();
        
        try {
          const stageResult = await this.processStage(stage, currentData);
          
          const stageResultData: StageResult = {
            stage: stage.name,
            success: true,
            data: stageResult,
            duration: Date.now() - stageStart
          };
          
          results.push(stageResultData);
          currentData = stageResult;

          // Report progress
          const progress = (results.length / pipeline.stages.length) * 100;
          pipeline.onProgress?.(progress);

        } catch (error: any) {
          const stageResultData: StageResult = {
            stage: stage.name,
            success: false,
            error,
            duration: Date.now() - stageStart
          };
          
          results.push(stageResultData);
          pipeline.onError?.(error, stage.name);

          if (stage.required !== false) {
            throw error;
          }
        }
      }

      return {
        success: true,
        data: currentData,
        processingTime: Date.now() - startTime,
        stages: results
      };

    } catch (error: any) {
      return {
        success: false,
        errors: [error],
        processingTime: Date.now() - startTime,
        stages: results
      };
    }
  }

  /**
   * Process a single stage
   */
  protected abstract processStage(stage: ProcessingStage, input: any): Promise<any>;

  /**
   * Validate input data
   */
  protected abstract validateInput(input: any): boolean;

  /**
   * Get processor capabilities
   */
  abstract getCapabilities(): Record<string, any>;

  /**
   * Get processor status
   */
  getStatus(): Record<string, any> {
    return {
      type: this.constructor.name,
      config: this.config,
      timestamp: new Date().toISOString()
    };
  }
}