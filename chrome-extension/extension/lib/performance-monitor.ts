/**
 * Performance Monitor
 *
 * Tracks CPU usage, memory usage, and latency for audio pipeline
 * Provides profiling data for optimization
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('PerformanceMonitor');

export interface LatencyMetrics {
  captureToEncode: number; // Audio capture to PCM encoding
  encodeToSend: number; // PCM encoding to WebSocket send
  receiveToPlay: number; // WebSocket receive to audio playback
  endToEnd: number; // Total end-to-end latency
}

export interface MemoryMetrics {
  usedJSHeapSize: number; // Used heap size in bytes
  totalJSHeapSize: number; // Total heap size in bytes
  jsHeapSizeLimit: number; // Heap size limit in bytes
  percentUsed: number; // Percentage of heap used
}

export interface CPUMetrics {
  audioWorkletCpu: number; // AudioWorklet CPU usage (estimate)
  mainThreadCpu: number; // Main thread CPU usage (estimate)
  totalCpu: number; // Total CPU usage
}

export class PerformanceMonitor {
  private latencyMarks = new Map<string, number>();
  private latencyHistory: LatencyMetrics[] = [];
  private memoryHistory: MemoryMetrics[] = [];
  private cpuHistory: CPUMetrics[] = [];
  private maxHistorySize = 100; // Keep last 100 samples

  // CPU profiling state
  private lastCpuMeasureTime: number | null = null;
  private audioWorkletCallCount = 0;
  private mainThreadCallCount = 0;

  /**
   * Mark start of latency measurement
   */
  markStart(label: string): void {
    this.latencyMarks.set(label, performance.now());
  }

  /**
   * Mark end of latency measurement and return duration
   */
  markEnd(label: string): number {
    const startTime = this.latencyMarks.get(label);
    if (!startTime) {
      logger.warn('Latency mark not found', { label });
      return 0;
    }

    const duration = performance.now() - startTime;
    this.latencyMarks.delete(label);

    return duration;
  }

  /**
   * Record complete latency metrics
   */
  recordLatency(metrics: LatencyMetrics): void {
    this.latencyHistory.push(metrics);

    // Trim history if needed
    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory.shift();
    }

    logger.debug('Latency recorded', {
      endToEnd: metrics.endToEnd.toFixed(2),
      capture: metrics.captureToEncode.toFixed(2),
      encode: metrics.encodeToSend.toFixed(2),
      play: metrics.receiveToPlay.toFixed(2),
    });
  }

  /**
   * Get average latency metrics
   */
  getAverageLatency(): LatencyMetrics | null {
    if (this.latencyHistory.length === 0) {
      return null;
    }

    const sum = this.latencyHistory.reduce(
      (acc, metrics) => ({
        captureToEncode: acc.captureToEncode + metrics.captureToEncode,
        encodeToSend: acc.encodeToSend + metrics.encodeToSend,
        receiveToPlay: acc.receiveToPlay + metrics.receiveToPlay,
        endToEnd: acc.endToEnd + metrics.endToEnd,
      }),
      { captureToEncode: 0, encodeToSend: 0, receiveToPlay: 0, endToEnd: 0 }
    );

    const count = this.latencyHistory.length;

    return {
      captureToEncode: sum.captureToEncode / count,
      encodeToSend: sum.encodeToSend / count,
      receiveToPlay: sum.receiveToPlay / count,
      endToEnd: sum.endToEnd / count,
    };
  }

  /**
   * Get 95th percentile latency (P95)
   */
  getP95Latency(): LatencyMetrics | null {
    if (this.latencyHistory.length === 0) {
      return null;
    }

    const sorted = [...this.latencyHistory].sort((a, b) => a.endToEnd - b.endToEnd);
    const p95Index = Math.floor(sorted.length * 0.95);

    return sorted[p95Index];
  }

  /**
   * Measure memory usage
   */
  measureMemory(): MemoryMetrics | null {
    if (!performance.memory) {
      logger.warn('Performance.memory API not available');
      return null;
    }

    const metrics: MemoryMetrics = {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      percentUsed: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100,
    };

    this.memoryHistory.push(metrics);

    // Trim history if needed
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    return metrics;
  }

  /**
   * Get average memory usage
   */
  getAverageMemory(): MemoryMetrics | null {
    if (this.memoryHistory.length === 0) {
      return null;
    }

    const sum = this.memoryHistory.reduce(
      (acc, metrics) => ({
        usedJSHeapSize: acc.usedJSHeapSize + metrics.usedJSHeapSize,
        totalJSHeapSize: acc.totalJSHeapSize + metrics.totalJSHeapSize,
        jsHeapSizeLimit: acc.jsHeapSizeLimit + metrics.jsHeapSizeLimit,
        percentUsed: acc.percentUsed + metrics.percentUsed,
      }),
      { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0, percentUsed: 0 }
    );

    const count = this.memoryHistory.length;

    return {
      usedJSHeapSize: sum.usedJSHeapSize / count,
      totalJSHeapSize: sum.totalJSHeapSize / count,
      jsHeapSizeLimit: sum.jsHeapSizeLimit / count,
      percentUsed: sum.percentUsed / count,
    };
  }

  /**
   * Track AudioWorklet call (for CPU profiling)
   */
  trackAudioWorkletCall(): void {
    this.audioWorkletCallCount++;
  }

  /**
   * Track main thread call (for CPU profiling)
   */
  trackMainThreadCall(): void {
    this.mainThreadCallCount++;
  }

  /**
   * Measure CPU usage (estimate based on call counts)
   */
  measureCPU(): CPUMetrics {
    const now = Date.now();
    const elapsed = this.lastCpuMeasureTime ? now - this.lastCpuMeasureTime : 1000;

    // Estimate CPU usage based on call counts per second
    const audioWorkletCps = (this.audioWorkletCallCount / elapsed) * 1000;
    const mainThreadCps = (this.mainThreadCallCount / elapsed) * 1000;

    // Rough estimation: Each call ~0.01% CPU
    const audioWorkletCpu = Math.min(100, audioWorkletCps * 0.01);
    const mainThreadCpu = Math.min(100, mainThreadCps * 0.01);
    const totalCpu = Math.min(100, audioWorkletCpu + mainThreadCpu);

    const metrics: CPUMetrics = {
      audioWorkletCpu,
      mainThreadCpu,
      totalCpu,
    };

    this.cpuHistory.push(metrics);

    // Trim history if needed
    if (this.cpuHistory.length > this.maxHistorySize) {
      this.cpuHistory.shift();
    }

    // Reset counters
    this.audioWorkletCallCount = 0;
    this.mainThreadCallCount = 0;
    this.lastCpuMeasureTime = now;

    return metrics;
  }

  /**
   * Get average CPU usage
   */
  getAverageCPU(): CPUMetrics | null {
    if (this.cpuHistory.length === 0) {
      return null;
    }

    const sum = this.cpuHistory.reduce(
      (acc, metrics) => ({
        audioWorkletCpu: acc.audioWorkletCpu + metrics.audioWorkletCpu,
        mainThreadCpu: acc.mainThreadCpu + metrics.mainThreadCpu,
        totalCpu: acc.totalCpu + metrics.totalCpu,
      }),
      { audioWorkletCpu: 0, mainThreadCpu: 0, totalCpu: 0 }
    );

    const count = this.cpuHistory.length;

    return {
      audioWorkletCpu: sum.audioWorkletCpu / count,
      mainThreadCpu: sum.mainThreadCpu / count,
      totalCpu: sum.totalCpu / count,
    };
  }

  /**
   * Get comprehensive performance report
   */
  getReport(): {
    latency: {
      average: LatencyMetrics | null;
      p95: LatencyMetrics | null;
      samples: number;
    };
    memory: {
      average: MemoryMetrics | null;
      current: MemoryMetrics | null;
      samples: number;
    };
    cpu: {
      average: CPUMetrics | null;
      current: CPUMetrics | null;
      samples: number;
    };
  } {
    return {
      latency: {
        average: this.getAverageLatency(),
        p95: this.getP95Latency(),
        samples: this.latencyHistory.length,
      },
      memory: {
        average: this.getAverageMemory(),
        current: this.measureMemory(),
        samples: this.memoryHistory.length,
      },
      cpu: {
        average: this.getAverageCPU(),
        current: this.cpuHistory[this.cpuHistory.length - 1] ?? null,
        samples: this.cpuHistory.length,
      },
    };
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    const report = this.getReport();

    logger.info('Performance Summary', {
      latency: {
        avgEndToEnd: report.latency.average?.endToEnd.toFixed(2) ?? 'N/A',
        p95EndToEnd: report.latency.p95?.endToEnd.toFixed(2) ?? 'N/A',
        samples: report.latency.samples,
      },
      memory: {
        avgUsedMB: report.memory.average
          ? (report.memory.average.usedJSHeapSize / 1024 / 1024).toFixed(2)
          : 'N/A',
        avgPercent: report.memory.average?.percentUsed.toFixed(1) ?? 'N/A',
        samples: report.memory.samples,
      },
      cpu: {
        avgTotal: report.cpu.average?.totalCpu.toFixed(1) ?? 'N/A',
        avgWorklet: report.cpu.average?.audioWorkletCpu.toFixed(1) ?? 'N/A',
        avgMainThread: report.cpu.average?.mainThreadCpu.toFixed(1) ?? 'N/A',
        samples: report.cpu.samples,
      },
    });
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.latencyMarks.clear();
    this.latencyHistory = [];
    this.memoryHistory = [];
    this.cpuHistory = [];
    this.lastCpuMeasureTime = null;
    this.audioWorkletCallCount = 0;
    this.mainThreadCallCount = 0;

    logger.info('Performance metrics reset');
  }
}
