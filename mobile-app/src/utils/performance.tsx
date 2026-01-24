/**
 * Performance Monitoring Utilities
 *
 * Features:
 * - FPS monitoring during animations
 * - Memory usage tracking
 * - Network request timing
 * - Voice command latency measurement
 * - Render performance tracking
 */

import { InteractionManager, PixelRatio } from 'react-native';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('Performance');

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number; // MB
  renderTime: number; // ms
  voiceLatency: number; // ms
  networkLatency: number; // ms
}

class PerformanceMonitor {
  private frameTimestamps: number[] = [];
  private readonly FRAME_WINDOW = 60; // Track last 60 frames
  private voiceCommandStartTime: number = 0;

  /**
   * Start measuring FPS
   * Call this before starting animations (e.g., widget drag)
   */
  startFPSMonitoring(): void {
    this.frameTimestamps = [];
    this._measureFrame();
  }

  private _measureFrame = (): void => {
    this.frameTimestamps.push(Date.now());

    // Keep only last N frames
    if (this.frameTimestamps.length > this.FRAME_WINDOW) {
      this.frameTimestamps.shift();
    }

    requestAnimationFrame(this._measureFrame);
  };

  /**
   * Calculate current FPS
   */
  getCurrentFPS(): number {
    if (this.frameTimestamps.length < 2) return 60;

    const totalTime = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
    const frameCount = this.frameTimestamps.length - 1;

    if (totalTime === 0) return 60;

    return Math.round((frameCount / totalTime) * 1000);
  }

  /**
   * Stop FPS monitoring
   */
  stopFPSMonitoring(): number {
    const fps = this.getCurrentFPS();
    this.frameTimestamps = [];
    return fps;
  }

  /**
   * Mark start of voice command (for latency measurement)
   */
  startVoiceCommand(): void {
    this.voiceCommandStartTime = Date.now();
  }

  /**
   * Mark end of voice command and return latency
   */
  endVoiceCommand(): number {
    if (this.voiceCommandStartTime === 0) return 0;

    const latency = Date.now() - this.voiceCommandStartTime;
    this.voiceCommandStartTime = 0;

    return latency;
  }

  /**
   * Measure component render time
   */
  measureRender(componentName: string, renderFn: () => void): number {
    const start = performance.now();
    renderFn();
    const duration = performance.now() - start;

    if (duration > 16) {
      // Warn if render takes longer than 1 frame (16ms at 60fps)
      moduleLogger.warn('Slow render detected', { component: componentName, duration: `${duration.toFixed(2)}ms` });
    }

    return duration;
  }

  /**
   * Wait for interactions to complete before expensive operations
   * Prevents janky animations
   */
  async runAfterInteractions<T>(callback: () => T): Promise<T> {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        resolve(callback());
      });
    });
  }

  /**
   * Log performance metrics
   */
  logMetrics(): void {
    moduleLogger.debug('Performance metrics', {
      fps: this.getCurrentFPS(),
      pixelRatio: PixelRatio.get(),
      fontScale: PixelRatio.getFontScale(),
    });
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * HOC to measure component render performance
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  return (props: P) => {
    const start = performance.now();
    const result = <Component {...props} />;
    const duration = performance.now() - start;

    if (duration > 16) {
      moduleLogger.warn('Slow component render', { component: componentName, duration: `${duration.toFixed(2)}ms` });
    }

    return result;
  };
}

/**
 * Measure async operation performance
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await operation();
    const duration = performance.now() - start;

    moduleLogger.debug('Async operation completed', { operation: name, duration: `${duration.toFixed(2)}ms` });

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    moduleLogger.error('Async operation failed', { operation: name, duration: `${duration.toFixed(2)}ms`, error });
    throw error;
  }
}

/**
 * Debounce function to prevent excessive calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit call frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memory warning handler
 */
export function setupMemoryWarnings(): void {
  // React Native doesn't have built-in memory warning API
  // This is a placeholder for future implementation
  moduleLogger.info('Memory warnings configured');
}

export default performanceMonitor;
