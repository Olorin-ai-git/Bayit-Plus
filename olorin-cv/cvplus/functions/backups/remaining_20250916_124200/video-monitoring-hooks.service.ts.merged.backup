// @ts-ignore - Export conflicts/**
 * Video Monitoring Hooks Service
 * 
 * Lightweight hooks service for integrating monitoring into existing video generation
 * without modifying the core service structure. Provides simple method calls that
 * can be inserted into existing video generation workflows.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { videoMonitoringIntegration } from './video-monitoring-integration.service';
import { VideoGenerationOptions, VideoGenerationResult } from './video-providers/base-provider.interface';

/**
 * Video Monitoring Hooks - Simple integration points
 */
export class VideoMonitoringHooks {
  
  /**
   * Hook: Video generation started
   * Call this when video generation begins
   */
  static async onGenerationStart(
    generationId: string,
    userId: string,
    jobId: string,
    providerId: string,
    options: VideoGenerationOptions
  ): Promise<void> {
    try {
      await videoMonitoringIntegration.startMonitoring(
        generationId,
        userId,
        jobId,
        providerId,
        options
      );
    } catch (error) {
    }
  }

  /**
   * Hook: Video generation completed
   * Call this when video generation completes (success or failure)
   */
  static async onGenerationComplete(
    generationId: string,
    result: VideoGenerationResult,
    resourceUsage?: any
  ): Promise<void> {
    try {
      await videoMonitoringIntegration.completeMonitoring(
        generationId,
        result,
        resourceUsage
      );
    } catch (error) {
    }
  }

  /**
   * Hook: Provider switched
   * Call this when the system switches from one provider to another
   */
  static async onProviderSwitch(
    generationId: string,
    fromProvider: string,
    toProvider: string,
    reason: string
  ): Promise<void> {
    try {
      await videoMonitoringIntegration.recordProviderSwitch(
        generationId,
        fromProvider,
        toProvider,
        reason
      );
    } catch (error) {
    }
  }

  /**
   * Hook: Error occurred
   * Call this when an error occurs during video generation
   */
  static async onError(
    generationId: string,
    error: any,
    providerId: string,
    recoveryAction?: string
  ): Promise<void> {
    try {
      await videoMonitoringIntegration.recordError(
        generationId,
        error,
        providerId,
        recoveryAction
      );
    } catch (error) {
    }
  }

  /**
   * Hook: Quality assessment
   * Call this when video quality is assessed
   */
  static async onQualityAssessment(
    generationId: string,
    qualityScore: number,
    qualityFactors?: any
  ): Promise<void> {
    try {
      await videoMonitoringIntegration.recordQualityScore(
        generationId,
        qualityScore,
        qualityFactors
      );
    } catch (error) {
    }
  }

  /**
   * Hook: User feedback received
   * Call this when user provides feedback on generated video
   */
  static async onUserFeedback(
    generationId: string,
    userId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    try {
      await videoMonitoringIntegration.recordUserFeedback(
        generationId,
        userId,
        rating,
        feedback
      );
    } catch (error) {
    }
  }

  /**
   * Hook: Get monitoring status
   * Call this to get current monitoring status for health checks
   */
  static async getStatus(): Promise<any> {
    try {
      return await videoMonitoringIntegration.getMonitoringStatus();
    } catch (error) {
      return {
        activeGenerations: 0,
        systemHealth: {},
        recentAlerts: []
      };
    }
  }

  /**
   * Utility: Generate unique generation ID
   * Helper method to generate consistent generation IDs
   */
  static generateGenerationId(userId: string, jobId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `video_gen_${userId}_${jobId}_${timestamp}_${random}`;
  }

  /**
   * Utility: Safe resource usage tracking
   * Helper to safely collect resource usage data
   */
  static collectResourceUsage(): any {
    try {
      return {
        cpuUsage: process.cpuUsage ? process.cpuUsage().user / 1000000 : 0,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        networkLatency: 0, // Would be measured if available
        timestamp: new Date()
      };
    } catch (error) {
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        networkLatency: 0,
        timestamp: new Date()
      };
    }
  }

  /**
   * Utility: Enable/disable monitoring
   * Control monitoring state for testing or maintenance
   */
  static setMonitoringEnabled(enabled: boolean): void {
    videoMonitoringIntegration.setMonitoringEnabled(enabled);
  }

  /**
   * Testing: Trigger manual metrics calculation
   */
  static async triggerMetricsCalculation(): Promise<void> {
    await videoMonitoringIntegration.triggerMetricsCalculation();
  }

  /**
   * Testing: Trigger manual alert check
   */
  static async triggerAlertCheck(): Promise<void> {
    await videoMonitoringIntegration.triggerAlertCheck();
  }
}

/**
 * Convenience wrapper for common monitoring patterns
 */
export class VideoGenerationMonitor {
  private generationId: string;
  private userId: string;
  private jobId: string;
  private providerId: string;
  private startTime: Date;

  constructor(userId: string, jobId: string, providerId: string) {
    this.generationId = VideoMonitoringHooks.generateGenerationId(userId, jobId);
    this.userId = userId;
    this.jobId = jobId;
    this.providerId = providerId;
    this.startTime = new Date();
  }

  /**
   * Start monitoring for this generation
   */
  async start(options: VideoGenerationOptions): Promise<void> {
    await VideoMonitoringHooks.onGenerationStart(
      this.generationId,
      this.userId,
      this.jobId,
      this.providerId,
      options
    );
  }

  /**
   * Complete monitoring for this generation
   */
  async complete(result: VideoGenerationResult): Promise<void> {
    const resourceUsage = VideoMonitoringHooks.collectResourceUsage();
    await VideoMonitoringHooks.onGenerationComplete(
      this.generationId,
      result,
      resourceUsage
    );
  }

  /**
   * Record provider switch
   */
  async switchProvider(toProvider: string, reason: string): Promise<void> {
    await VideoMonitoringHooks.onProviderSwitch(
      this.generationId,
      this.providerId,
      toProvider,
      reason
    );
    this.providerId = toProvider; // Update current provider
  }

  /**
   * Record error
   */
  async recordError(error: any, recoveryAction?: string): Promise<void> {
    await VideoMonitoringHooks.onError(
      this.generationId,
      error,
      this.providerId,
      recoveryAction
    );
  }

  /**
   * Record quality assessment
   */
  async recordQuality(qualityScore: number, qualityFactors?: any): Promise<void> {
    await VideoMonitoringHooks.onQualityAssessment(
      this.generationId,
      qualityScore,
      qualityFactors
    );
  }

  /**
   * Get generation ID
   */
  getGenerationId(): string {
    return this.generationId;
  }

  /**
   * Get generation duration
   */
  getDuration(): number {
    return Date.now() - this.startTime.getTime();
  }
}

/**
 * Simple helper for adding monitoring to existing video generation functions
 * 
 * Usage example:
 * ```typescript
 * const monitor = new VideoGenerationMonitor(userId, jobId, 'heygen');
 * await monitor.start(options);
 * try {
 *   const result = await generateVideo(options);
 *   await monitor.complete(result);
 *   return result;
 * } catch (error) {
 *   await monitor.recordError(error);
 *   throw error;
 * }
 * ```
 */