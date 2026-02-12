/**
 * Voice Analytics Service
 * Tracks and analyzes voice interaction metrics
 */

import type {
  VoiceSessionMetrics,
  IntentUsage,
  VoiceEvent,
  VoiceEventType,
  AnalyticsConfig,
  PerformanceMetrics
} from './types';

export class VoiceAnalytics {
  private config: AnalyticsConfig;
  private events: VoiceEvent[] = [];
  private sessionMetrics: Map<string, VoiceSessionMetrics> = new Map();
  private eventListeners: Map<VoiceEventType, Array<(event: VoiceEvent) => void>> = new Map();

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enableTracking: config.enableTracking ?? true,
      enablePerformanceMetrics: config.enablePerformanceMetrics ?? false,
      sampleRate: config.sampleRate || 1.0,
      batchSize: config.batchSize || 50
    };
  }

  /**
   * Track voice event
   */
  trackEvent(
    eventType: VoiceEventType,
    sessionId: string,
    data: Record<string, unknown> = {},
    userId?: string
  ): void {
    if (!this.config.enableTracking) return;
    if (Math.random() > this.config.sampleRate) return;

    const event: VoiceEvent = {
      eventType,
      sessionId,
      userId,
      timestamp: Date.now(),
      data
    };

    this.events.push(event);

    // Trim events if batch size exceeded
    if (this.events.length > this.config.batchSize * 2) {
      this.events = this.events.slice(-this.config.batchSize);
    }

    // Notify listeners
    this.notifyListeners(eventType, event);

    // Update session metrics
    this.updateSessionMetrics(event);
  }

  /**
   * Start tracking a session
   */
  startSession(sessionId: string, userId?: string): void {
    const metrics: VoiceSessionMetrics = {
      sessionId,
      userId,
      startTime: Date.now(),
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      successRate: 0,
      averageConfidence: 0,
      averageFrustration: 0,
      mostUsedIntents: [],
      languagesUsed: []
    };

    this.sessionMetrics.set(sessionId, metrics);

    this.trackEvent('session_start', sessionId, {}, userId);
  }

  /**
   * End tracking a session
   */
  endSession(sessionId: string): VoiceSessionMetrics | null {
    const metrics = this.sessionMetrics.get(sessionId);
    if (!metrics) return null;

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;

    this.trackEvent('session_end', sessionId, {
      duration: metrics.duration,
      totalCommands: metrics.totalCommands,
      successRate: metrics.successRate
    }, metrics.userId);

    return metrics;
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): VoiceSessionMetrics | null {
    return this.sessionMetrics.get(sessionId) || null;
  }

  /**
   * Get all session metrics
   */
  getAllSessionMetrics(): VoiceSessionMetrics[] {
    return Array.from(this.sessionMetrics.values());
  }

  /**
   * Track command
   */
  trackCommand(
    sessionId: string,
    intent: string,
    success: boolean,
    confidence: number,
    frustrationLevel: number,
    language: string = 'en-US'
  ): void {
    this.trackEvent(
      success ? 'command_executed' : 'command_failed',
      sessionId,
      {
        intent,
        success,
        confidence,
        frustrationLevel,
        language
      }
    );
  }

  /**
   * Track performance metrics
   */
  trackPerformance(
    sessionId: string,
    metrics: PerformanceMetrics
  ): void {
    if (!this.config.enablePerformanceMetrics) return;

    this.trackEvent('command_processed', sessionId, {
      performance: metrics
    });
  }

  /**
   * Add event listener
   */
  addEventListener(
    eventType: VoiceEventType,
    listener: (event: VoiceEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    eventType: VoiceEventType,
    listener: (event: VoiceEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Get events
   */
  getEvents(
    filter?: {
      eventType?: VoiceEventType;
      sessionId?: string;
      userId?: string;
      startTime?: number;
      endTime?: number;
    }
  ): VoiceEvent[] {
    let filtered = [...this.events];

    if (filter) {
      if (filter.eventType) {
        filtered = filtered.filter(e => e.eventType === filter.eventType);
      }
      if (filter.sessionId) {
        filtered = filtered.filter(e => e.sessionId === filter.sessionId);
      }
      if (filter.userId) {
        filtered = filtered.filter(e => e.userId === filter.userId);
      }
      if (filter.startTime) {
        filtered = filtered.filter(e => e.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        filtered = filtered.filter(e => e.timestamp <= filter.endTime!);
      }
    }

    return filtered;
  }

  /**
   * Clear analytics data
   */
  clear(): void {
    this.events = [];
    this.sessionMetrics.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(eventType: VoiceEventType, event: VoiceEvent): void {
    const listeners = this.eventListeners.get(eventType) || [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        // Silently catch listener errors to prevent disruption
      }
    }
  }

  /**
   * Update session metrics based on event
   */
  private updateSessionMetrics(event: VoiceEvent): void {
    const metrics = this.sessionMetrics.get(event.sessionId);
    if (!metrics) return;

    switch (event.eventType) {
      case 'command_executed':
      case 'command_failed':
        metrics.totalCommands++;

        if (event.eventType === 'command_executed') {
          metrics.successfulCommands++;
        } else {
          metrics.failedCommands++;
        }

        metrics.successRate = metrics.totalCommands > 0
          ? metrics.successfulCommands / metrics.totalCommands
          : 0;

        // Update confidence average
        if (typeof event.data.confidence === 'number') {
          const currentTotal = metrics.averageConfidence * (metrics.totalCommands - 1);
          metrics.averageConfidence = (currentTotal + event.data.confidence) / metrics.totalCommands;
        }

        // Update frustration average
        if (typeof event.data.frustrationLevel === 'number') {
          const currentTotal = metrics.averageFrustration * (metrics.totalCommands - 1);
          metrics.averageFrustration = (currentTotal + event.data.frustrationLevel) / metrics.totalCommands;
        }

        // Track intent usage
        if (typeof event.data.intent === 'string') {
          this.updateIntentUsage(metrics, event.data.intent, event.eventType === 'command_executed');
        }

        // Track language
        if (typeof event.data.language === 'string' && !metrics.languagesUsed.includes(event.data.language)) {
          metrics.languagesUsed.push(event.data.language);
        }
        break;
    }
  }

  /**
   * Update intent usage statistics
   */
  private updateIntentUsage(
    metrics: VoiceSessionMetrics,
    intent: string,
    success: boolean
  ): void {
    let intentUsage = metrics.mostUsedIntents.find(i => i.intent === intent);

    if (!intentUsage) {
      intentUsage = {
        intent,
        count: 0,
        successRate: 0
      };
      metrics.mostUsedIntents.push(intentUsage);
    }

    const previousTotal = intentUsage.count * intentUsage.successRate;
    intentUsage.count++;
    intentUsage.successRate = (previousTotal + (success ? 1 : 0)) / intentUsage.count;

    // Sort by count
    metrics.mostUsedIntents.sort((a, b) => b.count - a.count);

    // Keep top 10
    metrics.mostUsedIntents = metrics.mostUsedIntents.slice(0, 10);
  }
}

// Singleton instance
export const voiceAnalytics = new VoiceAnalytics();
