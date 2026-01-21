/**
 * Performance Monitor
 * Main performance monitoring orchestrator
 * Feature: Performance monitoring and optimization
 */

import type {
  PerformanceMonitorConfig,
  PerformanceMetric,
  ServiceMetrics,
  NavigationTimingMetrics,
  ResourceTimingMetrics,
  UserInteractionMetric,
  WebVitalsMetrics,
  NetworkMetric,
  MemoryMetric,
} from '../types/performance-types';
import { getMonitoringConfig } from '../config/monitoring-config';
import { generateMetricId } from '../utils/metric-helpers';
import {
  setupNavigationObserver,
  setupResourceObserver,
  setupInteractionObserver,
  setupWebVitalsObserver,
  setupMemoryObserver,
  setupNetworkObserver,
  cleanupObservers,
  type ObserverCleanup,
} from './observer-setup';
import {
  flushMetricBatches,
  enforceMetricsLimit,
  setupPeriodicFlush,
  setupVisibilityChangeFlush,
} from './metric-manager';

/**
 * Performance Monitor Class
 * Orchestrates all performance monitoring observers
 */
export class PerformanceMonitor {
  private config: PerformanceMonitorConfig;
  private metrics: PerformanceMetric[] = [];
  private navigationTiming: NavigationTimingMetrics | null = null;
  private resourceTimings: ResourceTimingMetrics[] = [];
  private interactions: UserInteractionMetric[] = [];
  private webVitals: Partial<WebVitalsMetrics> = {};
  private networkMetrics: NetworkMetric[] = [];
  private memoryUsage: MemoryMetric | null = null;

  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private observerCleanup: ObserverCleanup = {
    resourceObserver: null,
    cleanupInteractions: null,
    cleanupWebVitals: null,
    cleanupMemory: null,
    cleanupNetwork: null,
    cleanupXHR: null,
  };

  private isEnabled = false;

  constructor(config?: Partial<PerformanceMonitorConfig>) {
    const defaultConfig = getMonitoringConfig();
    this.config = { ...defaultConfig, ...config };
  }

  /** Enable performance monitoring */
  public enable(): void {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.setupObservers();
    this.startPeriodicFlush();
    this.setupVisibilityChangeHandler();
  }

  /** Disable performance monitoring */
  public disable(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    this.cleanup();
  }

  /** Get current metrics snapshot */
  public getMetrics(): ServiceMetrics {
    return {
      serviceName: this.config.serviceName || 'unknown',
      navigationTiming: this.navigationTiming || undefined,
      resourceTimings: [...this.resourceTimings],
      interactions: [...this.interactions],
      webVitals: Object.keys(this.webVitals).length > 0 ? this.webVitals as WebVitalsMetrics : undefined,
      networkMetrics: [...this.networkMetrics],
      errors: [],
      memoryUsage: this.memoryUsage || undefined,
    };
  }

  /** Flush metrics to endpoint */
  public async flush(): Promise<void> {
    await flushMetricBatches(this.config, this.metrics);
    this.metrics = [];
  }

  /** Add custom metric */
  public addMetric(metric: Partial<PerformanceMetric>): void {
    const fullMetric: PerformanceMetric = {
      id: metric.id || generateMetricId(),
      timestamp: metric.timestamp || Date.now(),
      type: metric.type || 'interaction',
      value: metric.value || 0,
      metadata: metric.metadata,
    };

    this.metrics.push(fullMetric);
    this.metrics = enforceMetricsLimit(this.metrics, this.config.maxMetrics);
  }

  /** Destroy monitor and cleanup */
  public destroy(): void {
    this.disable();
    this.metrics = [];
    this.resourceTimings = [];
    this.interactions = [];
    this.networkMetrics = [];
  }

  /** Setup all observers */
  private setupObservers(): void {
    setupNavigationObserver(
      (metric) => this.addMetric(metric),
      (metrics) => { this.navigationTiming = metrics; }
    );

    this.observerCleanup.resourceObserver = setupResourceObserver(
      this.config,
      (metric) => this.addMetric(metric),
      (metrics) => { this.resourceTimings.push(metrics); }
    );

    this.observerCleanup.cleanupInteractions = setupInteractionObserver(
      (metric) => this.addMetric(metric),
      (interaction) => { this.interactions.push(interaction); }
    );

    this.observerCleanup.cleanupWebVitals = setupWebVitalsObserver(
      this.config,
      (metric) => this.addMetric(metric),
      (metrics) => { this.webVitals = { ...this.webVitals, ...metrics }; }
    );

    this.observerCleanup.cleanupMemory = setupMemoryObserver(
      this.config,
      (metric) => this.addMetric(metric),
      (metric) => { this.memoryUsage = metric; }
    );

    const { cleanupFetch, cleanupXHR } = setupNetworkObserver(
      this.config,
      (metric) => this.addMetric(metric),
      (metric) => { this.networkMetrics.push(metric); }
    );

    this.observerCleanup.cleanupNetwork = cleanupFetch;
    this.observerCleanup.cleanupXHR = cleanupXHR;
  }

  /** Start periodic metric flushing */
  private startPeriodicFlush(): void {
    this.flushInterval = setupPeriodicFlush(() => this.flush(), this.config.flushInterval);
  }

  /** Setup visibility change handler */
  private setupVisibilityChangeHandler(): void {
    setupVisibilityChangeFlush(() => this.flush());
  }

  /** Cleanup all observers and intervals */
  private cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    cleanupObservers(this.observerCleanup);

    // Reset cleanup state
    this.observerCleanup = {
      resourceObserver: null,
      cleanupInteractions: null,
      cleanupWebVitals: null,
      cleanupMemory: null,
      cleanupNetwork: null,
      cleanupXHR: null,
    };
  }
}
