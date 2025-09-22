/**
 * Monitoring and Analytics Integration for Autonomous Investigation Microservice
 * Provides performance metrics collection, user interaction analytics, and error tracking
 */

import { PerformanceMonitor, type PerformanceMetric, type UserInteractionMetric, type ErrorMetric } from '../../../shared/monitoring/PerformanceMonitor';
import { eventBus, EventBusManager } from '../../../shared/events/eventBus';
import type { InvestigationConcept } from '../types/ui.types';
import type { Investigation } from '../types/investigation.types';

// Analytics event types
export interface ConceptUsageMetric {
  concept: InvestigationConcept;
  session_duration_ms: number;
  interactions_count: number;
  nodes_selected: number;
  filters_applied: number;
  exports_initiated: number;
  timestamp: number;
}

export interface InvestigationAnalytic {
  investigation_id: string;
  action: 'created' | 'started' | 'paused' | 'resumed' | 'stopped' | 'completed' | 'escalated';
  duration_ms?: number;
  concept_used?: InvestigationConcept;
  error_occurred?: boolean;
  error_type?: string;
  timestamp: number;
}

export interface GraphInteractionMetric {
  investigation_id: string;
  concept: InvestigationConcept;
  interaction_type: 'node_click' | 'node_hover' | 'edge_select' | 'zoom' | 'pan' | 'filter';
  node_type?: string;
  response_time_ms: number;
  timestamp: number;
}

export interface AgentMonitoringMetric {
  investigation_id: string;
  agent_name: string;
  agent_type: string;
  execution_time_ms: number;
  success: boolean;
  error_message?: string;
  memory_usage_mb?: number;
  cpu_usage_percent?: number;
  timestamp: number;
}

/**
 * Monitoring and Analytics Service for Autonomous Investigation
 */
export class AutonomousInvestigationMonitoring {
  private performanceMonitor: PerformanceMonitor;
  private eventManager: EventBusManager;
  private sessionStartTime: number = Date.now();
  private currentConcept: InvestigationConcept | null = null;
  private conceptStartTime: number = Date.now();
  private conceptInteractions: number = 0;
  private isEnabled: boolean = true;

  // Metrics storage for batching
  private conceptMetrics: ConceptUsageMetric[] = [];
  private investigationAnalytics: InvestigationAnalytic[] = [];
  private graphInteractions: GraphInteractionMetric[] = [];
  private agentMetrics: AgentMonitoringMetric[] = [];

  // Batch configuration
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(options?: {
    endpoint?: string;
    apiKey?: string;
    enableDetailedTracking?: boolean;
  }) {
    this.performanceMonitor = new PerformanceMonitor('autonomous-investigation', {
      endpoint: options?.endpoint,
      apiKey: options?.apiKey,
      enableWebVitals: true,
      batchSize: this.BATCH_SIZE,
      flushInterval: this.FLUSH_INTERVAL,
    });

    this.eventManager = EventBusManager.getInstance();
    this.initialize();
  }

  /**
   * Initialize monitoring and analytics
   */
  private initialize(): void {
    this.startPeriodicFlush();
    this.setupEventListeners();
    this.trackServiceStartup();

    console.log('[AutonomousInvestigationMonitoring] Monitoring initialized');
  }

  /**
   * Track service startup metrics
   */
  private trackServiceStartup(): void {
    this.performanceMonitor.recordMetric({
      name: 'service_startup',
      value: Date.now() - this.sessionStartTime,
      unit: 'ms',
      service: 'autonomous-investigation',
      timestamp: Date.now(),
      tags: {
        session_id: this.generateSessionId(),
        version: '1.0.0',
      },
    });
  }

  /**
   * Setup event listeners for automatic tracking
   */
  private setupEventListeners(): void {
    // Track investigation lifecycle events
    this.eventManager.subscribe(
      'auto:investigation:started',
      (data) => this.trackInvestigationAnalytic(data.investigation.id, 'started'),
      'autonomous-investigation-monitoring'
    );

    this.eventManager.subscribe(
      'auto:investigation:completed',
      (data) => this.trackInvestigationAnalytic(data.investigationId, 'completed'),
      'autonomous-investigation-monitoring'
    );

    // Track errors
    this.eventManager.subscribe(
      'service:error',
      (data) => this.trackError('service_error', data.error.message),
      'autonomous-investigation-monitoring'
    );
  }

  /**
   * Track concept usage when user switches between UI concepts
   */
  public trackConceptUsage(
    concept: InvestigationConcept,
    previousConcept?: InvestigationConcept,
    additionalMetrics?: {
      nodes_selected?: number;
      filters_applied?: number;
      exports_initiated?: number;
    }
  ): void {
    if (!this.isEnabled) return;

    const now = Date.now();

    // Record metrics for previous concept if switching
    if (previousConcept && this.currentConcept) {
      const sessionDuration = now - this.conceptStartTime;

      const metric: ConceptUsageMetric = {
        concept: this.currentConcept,
        session_duration_ms: sessionDuration,
        interactions_count: this.conceptInteractions,
        nodes_selected: additionalMetrics?.nodes_selected || 0,
        filters_applied: additionalMetrics?.filters_applied || 0,
        exports_initiated: additionalMetrics?.exports_initiated || 0,
        timestamp: now,
      };

      this.conceptMetrics.push(metric);
      this.checkAndFlushBatch();
    }

    // Update current concept tracking
    this.currentConcept = concept;
    this.conceptStartTime = now;
    this.conceptInteractions = 0;

    // Record performance metric
    this.performanceMonitor.recordMetric({
      name: 'concept_switch',
      value: 1,
      unit: 'count',
      service: 'autonomous-investigation',
      timestamp: now,
      tags: {
        from_concept: previousConcept || 'none',
        to_concept: concept,
      },
    });
  }

  /**
   * Track investigation-related analytics
   */
  public trackInvestigationAnalytic(
    investigationId: string,
    action: InvestigationAnalytic['action'],
    options?: {
      duration_ms?: number;
      concept_used?: InvestigationConcept;
      error_occurred?: boolean;
      error_type?: string;
    }
  ): void {
    if (!this.isEnabled) return;

    const analytic: InvestigationAnalytic = {
      investigation_id: investigationId,
      action,
      duration_ms: options?.duration_ms,
      concept_used: options?.concept_used || this.currentConcept || undefined,
      error_occurred: options?.error_occurred,
      error_type: options?.error_type,
      timestamp: Date.now(),
    };

    this.investigationAnalytics.push(analytic);

    // Also record as performance metric
    this.performanceMonitor.recordMetric({
      name: `investigation_${action}`,
      value: options?.duration_ms || 1,
      unit: options?.duration_ms ? 'ms' : 'count',
      service: 'autonomous-investigation',
      timestamp: Date.now(),
      tags: {
        investigation_id: investigationId,
        concept: this.currentConcept || 'unknown',
        success: !options?.error_occurred,
      },
    });

    this.checkAndFlushBatch();
  }

  /**
   * Track graph interaction metrics
   */
  public trackGraphInteraction(
    investigationId: string,
    interactionType: GraphInteractionMetric['interaction_type'],
    responseTimeMs: number,
    nodeType?: string
  ): void {
    if (!this.isEnabled) return;

    this.conceptInteractions++;

    const metric: GraphInteractionMetric = {
      investigation_id: investigationId,
      concept: this.currentConcept || 'power-grid',
      interaction_type: interactionType,
      node_type: nodeType,
      response_time_ms: responseTimeMs,
      timestamp: Date.now(),
    };

    this.graphInteractions.push(metric);

    // Record as user interaction metric
    this.performanceMonitor.recordUserInteraction({
      action: `graph_${interactionType}`,
      service: 'autonomous-investigation',
      responseTime: responseTimeMs,
      success: true,
      timestamp: Date.now(),
    });

    this.checkAndFlushBatch();
  }

  /**
   * Track agent execution metrics
   */
  public trackAgentExecution(
    investigationId: string,
    agentName: string,
    agentType: string,
    executionTimeMs: number,
    success: boolean,
    errorMessage?: string,
    resourceUsage?: {
      memory_usage_mb?: number;
      cpu_usage_percent?: number;
    }
  ): void {
    if (!this.isEnabled) return;

    const metric: AgentMonitoringMetric = {
      investigation_id: investigationId,
      agent_name: agentName,
      agent_type: agentType,
      execution_time_ms: executionTimeMs,
      success,
      error_message: errorMessage,
      memory_usage_mb: resourceUsage?.memory_usage_mb,
      cpu_usage_percent: resourceUsage?.cpu_usage_percent,
      timestamp: Date.now(),
    };

    this.agentMetrics.push(metric);

    // Record as performance metric
    this.performanceMonitor.recordMetric({
      name: 'agent_execution_time',
      value: executionTimeMs,
      unit: 'ms',
      service: 'autonomous-investigation',
      timestamp: Date.now(),
      tags: {
        agent_name: agentName,
        agent_type: agentType,
        success: success.toString(),
      },
    });

    this.checkAndFlushBatch();
  }

  /**
   * Track error events
   */
  public trackError(
    errorType: string,
    errorMessage: string,
    investigationId?: string,
    concept?: InvestigationConcept,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    if (!this.isEnabled) return;

    const errorMetric: ErrorMetric = {
      service: 'autonomous-investigation',
      error: `${errorType}: ${errorMessage}`,
      severity,
      timestamp: Date.now(),
    };

    this.performanceMonitor.recordError(errorMetric);

    // Track in investigation analytics if investigation context available
    if (investigationId) {
      this.trackInvestigationAnalytic(investigationId, 'created', {
        error_occurred: true,
        error_type: errorType,
        concept_used: concept,
      });
    }

    console.error(`[AutonomousInvestigationMonitoring] Error tracked: ${errorType}`, errorMessage);
  }

  /**
   * Record custom performance metric
   */
  public recordCustomMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): void {
    if (!this.isEnabled) return;

    this.performanceMonitor.recordMetric({
      name,
      value,
      unit,
      service: 'autonomous-investigation',
      timestamp: Date.now(),
      tags: {
        concept: this.currentConcept || 'unknown',
        ...tags,
      },
    });
  }

  /**
   * Get analytics summary for dashboard
   */
  public getAnalyticsSummary(): {
    session_duration_ms: number;
    total_interactions: number;
    concepts_used: number;
    investigations_handled: number;
    error_rate: number;
    avg_response_time_ms: number;
  } {
    const sessionDuration = Date.now() - this.sessionStartTime;
    const totalInteractions = this.conceptInteractions + this.graphInteractions.length;
    const uniqueConcepts = new Set(this.conceptMetrics.map(m => m.concept)).size;
    const investigations = new Set(this.investigationAnalytics.map(a => a.investigation_id)).size;
    const errors = this.investigationAnalytics.filter(a => a.error_occurred).length;
    const errorRate = this.investigationAnalytics.length > 0 ? (errors / this.investigationAnalytics.length) * 100 : 0;
    const avgResponseTime = this.graphInteractions.length > 0
      ? this.graphInteractions.reduce((sum, i) => sum + i.response_time_ms, 0) / this.graphInteractions.length
      : 0;

    return {
      session_duration_ms: sessionDuration,
      total_interactions: totalInteractions,
      concepts_used: uniqueConcepts,
      investigations_handled: investigations,
      error_rate: errorRate,
      avg_response_time_ms: avgResponseTime,
    };
  }

  /**
   * Check if batches need flushing
   */
  private checkAndFlushBatch(): void {
    const totalMetrics = this.conceptMetrics.length +
                        this.investigationAnalytics.length +
                        this.graphInteractions.length +
                        this.agentMetrics.length;

    if (totalMetrics >= this.BATCH_SIZE) {
      this.flushMetrics();
    }
  }

  /**
   * Start periodic metric flushing
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Flush accumulated metrics
   */
  private flushMetrics(): void {
    if (!this.isEnabled) return;

    const metricsToFlush = {
      concept_usage: [...this.conceptMetrics],
      investigation_analytics: [...this.investigationAnalytics],
      graph_interactions: [...this.graphInteractions],
      agent_metrics: [...this.agentMetrics],
      timestamp: Date.now(),
      service: 'autonomous-investigation',
    };

    // Clear accumulated metrics
    this.conceptMetrics = [];
    this.investigationAnalytics = [];
    this.graphInteractions = [];
    this.agentMetrics = [];

    // Emit event for analytics service
    this.eventManager.emit('analytics:metrics_batch', metricsToFlush);

    console.log('[AutonomousInvestigationMonitoring] Flushed metrics batch:', Object.keys(metricsToFlush));
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Enable/disable monitoring
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      this.performanceMonitor.enable();
    } else {
      this.performanceMonitor.disable();
    }
    console.log(`[AutonomousInvestigationMonitoring] Monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.flushMetrics(); // Final flush
    this.performanceMonitor.destroy();
    this.eventManager.cleanup('autonomous-investigation-monitoring');

    console.log('[AutonomousInvestigationMonitoring] Monitoring destroyed');
  }
}

// Singleton instance
export const autonomousInvestigationMonitoring = new AutonomousInvestigationMonitoring();