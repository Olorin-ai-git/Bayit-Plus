/**
 * Performance Monitor
 * Tracks performance metrics: startup time, screen render time, memory, frame rate
 */

import { Platform } from 'react-native';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

export interface ScreenPerformance {
  screenName: string;
  renderTime: number;
  navigateTime: number;
  timestamp: number;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
}

export interface PerformanceBenchmark {
  appStartup: number;
  navigationLatency: number;
  screenRenderTime: number;
  memoryUsage: number;
  frameRate: number;
}

/**
 * Performance monitoring class
 */
class PerformanceMonitorClass {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private screenMetrics: ScreenPerformance[] = [];
  private marks: Map<string, number> = new Map();

  /**
   * Mark start of performance measurement
   */
  startMeasure(name: string): void {
    this.marks.set(name, Date.now());
  }

  /**
   * End performance measurement
   */
  endMeasure(name: string): PerformanceMetric {
    const startTime = this.marks.get(name);
    if (!startTime) {
      throw new Error(`No mark found for ${name}`);
    }

    const duration = Date.now() - startTime;
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
    };

    this.metrics.set(name, metric);
    this.marks.delete(name);

    return metric;
  }

  /**
   * Record screen render performance
   */
  recordScreenRender(screenName: string, renderTime: number, navigateTime: number): void {
    this.screenMetrics.push({
      screenName,
      renderTime,
      navigateTime,
      timestamp: Date.now(),
    });

    // Keep only last 50 screen metrics
    if (this.screenMetrics.length > 50) {
      this.screenMetrics.shift();
    }
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get average render time for screen
   */
  getAverageScreenRenderTime(screenName?: string): number {
    const metrics = screenName
      ? this.screenMetrics.filter((m) => m.screenName === screenName)
      : this.screenMetrics;

    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.renderTime, 0);
    return total / metrics.length;
  }

  /**
   * Get performance benchmarks
   */
  getBenchmarks(): PerformanceBenchmark {
    const startup = this.getMetric('app_startup')?.duration || 0;
    const navigation = this.screenMetrics.length > 0
      ? this.screenMetrics.reduce((sum, m) => sum + m.navigateTime, 0) / this.screenMetrics.length
      : 0;
    const render = this.getAverageScreenRenderTime();

    return {
      appStartup: startup,
      navigationLatency: navigation,
      screenRenderTime: render,
      memoryUsage: 0, // Would require native module
      frameRate: 60, // Would require native monitoring
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.screenMetrics = [];
    this.marks.clear();
  }

  /**
   * Log all metrics to console (dev only)
   */
  logMetrics(): void {
    const benchmarks = this.getBenchmarks();
    console.log('=== Performance Metrics ===');
    console.log(`App Startup: ${benchmarks.appStartup}ms`);
    console.log(`Navigation Latency: ${benchmarks.navigationLatency.toFixed(1)}ms`);
    console.log(`Screen Render Time: ${benchmarks.screenRenderTime.toFixed(1)}ms`);
    console.log(`Memory Usage: ${benchmarks.memoryUsage}MB`);
    console.log(`Frame Rate: ${benchmarks.frameRate} FPS`);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitorClass();

/**
 * Hook for screen performance tracking
 */
export function useScreenPerformance(screenName: string) {
  const startTime = Date.now();
  let renderStartTime = Date.now();

  return {
    recordRenderComplete: (navigateTime: number = 0) => {
      const renderTime = Date.now() - renderStartTime;
      performanceMonitor.recordScreenRender(screenName, renderTime, navigateTime);
    },
    startRenderTimer: () => {
      renderStartTime = Date.now();
    },
  };
}

/**
 * Performance thresholds (milliseconds)
 */
export const PERFORMANCE_TARGETS = {
  STARTUP_TIME: 3000, // App should start in < 3 seconds
  NAVIGATION_LATENCY: 300, // Navigation should respond in < 300ms
  SCREEN_RENDER_TIME: 500, // Screens should render in < 500ms
  MEMORY_USAGE: 250, // Keep baseline memory < 250MB
  FRAME_RATE: 60, // Maintain 60 FPS
};

/**
 * Check if performance meets targets
 */
export function evaluatePerformance(benchmarks: PerformanceBenchmark): {
  startup: boolean;
  navigation: boolean;
  rendering: boolean;
  memory: boolean;
  frameRate: boolean;
  overall: boolean;
} {
  return {
    startup: benchmarks.appStartup < PERFORMANCE_TARGETS.STARTUP_TIME,
    navigation: benchmarks.navigationLatency < PERFORMANCE_TARGETS.NAVIGATION_LATENCY,
    rendering: benchmarks.screenRenderTime < PERFORMANCE_TARGETS.SCREEN_RENDER_TIME,
    memory: benchmarks.memoryUsage < PERFORMANCE_TARGETS.MEMORY_USAGE,
    frameRate: benchmarks.frameRate >= PERFORMANCE_TARGETS.FRAME_RATE,
    get overall() {
      return this.startup && this.navigation && this.rendering && this.memory && this.frameRate;
    },
  };
}

/**
 * Get platform-specific performance info
 */
export function getPlatformPerformanceInfo() {
  return {
    platform: Platform.OS,
    version: Platform.Version,
    // Additional metrics would come from native modules
  };
}
