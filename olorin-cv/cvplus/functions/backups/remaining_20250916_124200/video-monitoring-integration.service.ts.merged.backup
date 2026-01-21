// @ts-ignore - Export conflicts/**
 * Video Monitoring Integration Service
 * 
 * Integration layer between video generation services and monitoring/analytics system.
 * Provides seamless monitoring capabilities without modifying existing video generation code.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { PerformanceMonitorService } from './performance-monitor.service';
import { AnalyticsEngineService } from './analytics-engine.service';
import { AlertManagerService } from './alert-manager.service';
import { 
  VideoGenerationOptions,
  VideoGenerationResult 
} from './video-providers/base-provider.interface';

export interface MonitoringContext {
  generationId: string;
  userId: string;
  jobId: string;
  providerId: string;
  startTime: Date;
  options: VideoGenerationOptions;
}

/**
 * Video Monitoring Integration Service
 */
export class VideoMonitoringIntegrationService {
  private performanceMonitor: PerformanceMonitorService;
  private analyticsEngine: AnalyticsEngineService;
  private alertManager: AlertManagerService;
  
  // Monitoring state
  private activeGenerations: Map<string, MonitoringContext> = new Map();
  private monitoringEnabled: boolean = true;

  constructor() {
    this.performanceMonitor = new PerformanceMonitorService();
    this.analyticsEngine = new AnalyticsEngineService();
    this.alertManager = new AlertManagerService();

    // Start background monitoring tasks
    this.initializeBackgroundMonitoring();
  }

  /**
   * Initialize video generation monitoring
   */
  async startMonitoring(
    generationId: string,
    userId: string,
    jobId: string,
    providerId: string,
    options: VideoGenerationOptions
  ): Promise<void> {
    if (!this.monitoringEnabled) return;

    try {
      const context: MonitoringContext = {
        generationId,
        userId,
        jobId,
        providerId,
        startTime: new Date(),
        options
      };

      // Store context for completion tracking
      this.activeGenerations.set(generationId, context);

      // Record generation start metrics
      await this.performanceMonitor.recordGenerationMetrics(
        generationId,
        userId,
        jobId,
        providerId,
        options
      );


    } catch (error) {
      // Don't throw error to avoid breaking video generation
    }
  }

  /**
   * Complete video generation monitoring
   */
  async completeMonitoring(
    generationId: string,
    result: VideoGenerationResult,
    resourceUsage?: any
  ): Promise<void> {
    if (!this.monitoringEnabled) return;

    try {
      const context = this.activeGenerations.get(generationId);
      if (!context) {
        return;
      }

      // Update generation metrics with completion data
      await this.performanceMonitor.updateGenerationMetrics(
        generationId,
        result,
        resourceUsage
      );

      // Remove from active generations
      this.activeGenerations.delete(generationId);


    } catch (error) {
    }
  }

  /**
   * Record provider switch event
   */
  async recordProviderSwitch(
    generationId: string,
    fromProvider: string,
    toProvider: string,
    reason: string
  ): Promise<void> {
    if (!this.monitoringEnabled) return;

    try {
      const context = this.activeGenerations.get(generationId);
      if (!context) return;

      // Record provider switch event
      await this.performanceMonitor['recordAnalyticsEvent']({
        eventId: `${generationId}_provider_switch`,
        userId: context.userId,
        jobId: context.jobId,
        eventType: 'cv_generated',
        eventCategory: 'usage',
        eventData: {
          action: 'provider_switch',
          properties: {
            fromProvider,
            toProvider,
            reason,
            generationId
          }
        },
        timestamp: new Date(),
        featureUsed: 'video_generation'
      });


    } catch (error) {
    }
  }

  /**
   * Record error event
   */
  async recordError(
    generationId: string,
    error: any,
    providerId: string,
    recoveryAction?: string
  ): Promise<void> {
    if (!this.monitoringEnabled) return;

    try {
      const context = this.activeGenerations.get(generationId);
      if (!context) return;

      // Record error event
      await this.performanceMonitor['recordAnalyticsEvent']({
        eventId: `${generationId}_error`,
        userId: context.userId,
        jobId: context.jobId,
        eventType: 'cv_generated',
        eventCategory: 'error',
        eventData: {
          action: 'generation_error',
          properties: {
            errorType: error.type || 'unknown',
            errorMessage: error.message,
            providerId,
            recoveryAction: recoveryAction || 'none',
            generationId
          }
        },
        timestamp: new Date(),
        featureUsed: 'video_generation'
      });


    } catch (error) {
    }
  }

  /**
   * Record quality score
   */
  async recordQualityScore(
    generationId: string,
    qualityScore: number,
    qualityFactors?: any
  ): Promise<void> {
    if (!this.monitoringEnabled) return;

    try {
      const context = this.activeGenerations.get(generationId);
      if (!context) return;

      // Record quality score event
      await this.performanceMonitor['recordAnalyticsEvent']({
        eventId: `${generationId}_quality`,
        userId: context.userId,
        jobId: context.jobId,
        eventType: 'cv_generated',
        eventCategory: 'usage',
        eventData: {
          action: 'quality_assessment',
          value: qualityScore,
          properties: {
            qualityScore,
            qualityFactors: qualityFactors || {},
            generationId
          }
        },
        timestamp: new Date(),
        featureUsed: 'video_generation'
      });


    } catch (error) {
    }
  }

  /**
   * Record user feedback
   */
  async recordUserFeedback(
    generationId: string,
    userId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    if (!this.monitoringEnabled) return;

    try {
      // Record user feedback event
      await this.performanceMonitor['recordAnalyticsEvent']({
        eventId: `${generationId}_feedback`,
        userId,
        eventType: 'cv_generated',
        eventCategory: 'engagement',
        eventData: {
          action: 'user_feedback',
          value: rating,
          properties: {
            rating,
            feedback: feedback || '',
            generationId
          }
        },
        timestamp: new Date(),
        featureUsed: 'video_generation'
      });


    } catch (error) {
    }
  }

  /**
   * Get real-time monitoring status
   */
  async getMonitoringStatus(): Promise<{
    activeGenerations: number;
    systemHealth: any;
    recentAlerts: any[];
  }> {
    try {
      // Get recent system metrics
      const systemMetrics = await this.performanceMonitor.calculateSystemMetrics('1h');
      
      // Get recent alerts
      const alertsData = await this.alertManager.getAlertDashboard();

      return {
        activeGenerations: this.activeGenerations.size,
        systemHealth: {
          successRate: systemMetrics.successRate,
          averageGenerationTime: systemMetrics.averageGenerationTime,
          errorRate: systemMetrics.errorRate,
          systemUptime: systemMetrics.systemUptime
        },
        recentAlerts: alertsData.activeAlerts.slice(0, 5)
      };

    } catch (error) {
      return {
        activeGenerations: this.activeGenerations.size,
        systemHealth: {},
        recentAlerts: []
      };
    }
  }

  /**
   * Initialize background monitoring tasks
   */
  private initializeBackgroundMonitoring(): void {
    // Check for alerts every 5 minutes
    setInterval(async () => {
      try {
        if (!this.monitoringEnabled) return;

        // Calculate current metrics
        const performanceMetrics = await this.performanceMonitor.calculateSystemMetrics('1h');
        const qualityInsights = await this.analyticsEngine.generateQualityInsights('1h');
        const businessMetrics = await this.analyticsEngine.generateBusinessMetrics('1h');

        // Check for alerts
        await this.alertManager.checkAlerts({
          performance: performanceMetrics,
          quality: qualityInsights,
          business: businessMetrics
        });

        // Process escalations
        await this.alertManager.processEscalations();

      } catch (error) {
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Generate analytics every hour
    setInterval(async () => {
      try {
        if (!this.monitoringEnabled) return;

        // Generate business metrics
        await this.analyticsEngine.generateBusinessMetrics('1h');

        // Generate user insights
        await this.analyticsEngine.generateUserBehaviorInsights();

        // Generate quality insights
        await this.analyticsEngine.generateQualityInsights('1h');

      } catch (error) {
      }
    }, 60 * 60 * 1000); // 1 hour

    // Clean up stale generations every 30 minutes
    setInterval(async () => {
      try {
        const staleTime = Date.now() - (30 * 60 * 1000); // 30 minutes ago
        
        for (const [generationId, context] of this.activeGenerations.entries()) {
          if (context.startTime.getTime() < staleTime) {
            this.activeGenerations.delete(generationId);
          }
        }

      } catch (error) {
      }
    }, 30 * 60 * 1000); // 30 minutes

  }

  /**
   * Enable or disable monitoring
   */
  setMonitoringEnabled(enabled: boolean): void {
    this.monitoringEnabled = enabled;
  }

  /**
   * Get monitoring configuration
   */
  getConfiguration(): any {
    return {
      monitoringEnabled: this.monitoringEnabled,
      activeGenerations: this.activeGenerations.size,
      backgroundTasksActive: true
    };
  }

  /**
   * Manual trigger for metrics calculation (for testing)
   */
  async triggerMetricsCalculation(): Promise<void> {
    try {
      const metrics = await this.performanceMonitor.calculateSystemMetrics('1h');
      console.log('[VideoMonitoring] Manual metrics calculation completed:', {
        totalGenerations: metrics.totalGenerations,
        successRate: metrics.successRate,
        averageTime: metrics.averageGenerationTime
      });
    } catch (error) {
    }
  }

  /**
   * Manual trigger for alert checking (for testing)
   */
  async triggerAlertCheck(): Promise<void> {
    try {
      const performanceMetrics = await this.performanceMonitor.calculateSystemMetrics('1h');
      const alerts = await this.alertManager.checkAlerts({
        performance: performanceMetrics
      });
    } catch (error) {
    }
  }
}

// Singleton instance for global use
export const videoMonitoringIntegration = new VideoMonitoringIntegrationService();