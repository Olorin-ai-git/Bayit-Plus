/**
 * Hybrid Graph Polling Service
 * Feature: 006-hybrid-graph-integration
 *
 * Generic polling service with exponential backoff, retry logic, and cancellation support.
 * Configuration-driven with no hardcoded values.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven: All settings from hybridGraphConfig
 * - Complete implementation: No placeholders or TODOs
 * - Cancellable: AbortController support for cleanup
 */

import { getHybridGraphConfig } from "../../../shared/config/hybridGraphConfig";
import type { InvestigationStatus } from "../types/hybridGraphTypes";

/** Polling callback function signature */
export type PollingCallback = (status: InvestigationStatus) => void;

/** Polling error callback signature */
export type ErrorCallback = (error: Error) => void;

/** Polling service options */
export interface PollingOptions {
  onUpdate: PollingCallback;
  onError?: ErrorCallback;
  onComplete?: () => void;
}

/** Polling state */
interface PollingState {
  isPolling: boolean;
  retryCount: number;
  currentInterval: number;
  abortController: AbortController | null;
  timeoutId: number | null;
  isCallInProgress: boolean;
}

/**
 * Service for polling investigation status with exponential backoff.
 * Automatically adjusts polling interval based on failures and status.
 */
export class HybridGraphPollingService {
  private state: PollingState;
  private config: ReturnType<typeof getHybridGraphConfig>;
  private investigationId: string;
  private options: PollingOptions;

  constructor(investigationId: string, options: PollingOptions) {
    this.investigationId = investigationId;
    this.options = options;
    this.config = getHybridGraphConfig();

    this.state = {
      isPolling: false,
      retryCount: 0,
      currentInterval: this.config.polling.updateIntervalMs,
      abortController: null,
      timeoutId: null,
      isCallInProgress: false,
    };
  }

  /**
   * Start polling for investigation status updates.
   * Automatically handles retries and exponential backoff.
   */
  public start(): void {
    if (this.state.isPolling) {
      return;
    }

    this.state.isPolling = true;
    this.state.abortController = new AbortController();
    this.state.retryCount = 0;
    this.state.currentInterval = this.config.polling.updateIntervalMs;

    this.poll();
  }

  /**
   * Stop polling and cleanup resources.
   */
  public stop(): void {
    this.state.isPolling = false;
    this.state.isCallInProgress = false; // Clear in-progress flag when stopping

    if (this.state.abortController) {
      this.state.abortController.abort();
      this.state.abortController = null;
    }

    if (this.state.timeoutId) {
      window.clearTimeout(this.state.timeoutId);
      this.state.timeoutId = null;
    }
  }

  /**
   * Check if polling is currently active.
   */
  public isActive(): boolean {
    return this.state.isPolling;
  }

  /**
   * Get current retry count.
   */
  public getRetryCount(): number {
    return this.state.retryCount;
  }

  /**
   * Perform a single poll request.
   */
  private async poll(): Promise<void> {
    if (!this.state.isPolling || !this.state.abortController) {
      return;
    }

    // Prevent concurrent calls - if a call is already in progress, skip this one
    if (this.state.isCallInProgress) {
      console.log('[HybridGraphPollingService] ⏸️ Call already in progress, skipping this request');
      // Schedule next poll with current interval
      this.scheduleNextPoll();
      return;
    }

    // Mark call as in progress
    this.state.isCallInProgress = true;

    try {
      const status = await this.fetchStatus(this.state.abortController.signal);

      this.state.retryCount = 0;
      this.state.currentInterval = this.config.polling.updateIntervalMs;

      this.options.onUpdate(status);

      if (this.isTerminalStatus(status.status)) {
        this.handleCompletion();
        return;
      }

      this.scheduleNextPoll();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      this.handleError(error as Error);
    } finally {
      // Always clear the in-progress flag when done
      this.state.isCallInProgress = false;
    }
  }

  /**
   * Fetch investigation status from API.
   */
  private async fetchStatus(signal: AbortSignal): Promise<InvestigationStatus> {
    const apiBaseUrl = this.config.apiBaseUrl;
    const requestTimeoutMs = this.config.polling.requestTimeoutMs;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs);

    signal.addEventListener("abort", () => controller.abort());

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/investigations/${this.investigationId}/status`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  /**
   * Check if status indicates investigation completion.
   */
  private isTerminalStatus(status: string): boolean {
    return ["completed", "failed", "timeout"].includes(status);
  }

  /**
   * Handle successful completion.
   */
  private handleCompletion(): void {
    this.stop();
    if (this.options.onComplete) {
      this.options.onComplete();
    }
  }

  /**
   * Handle polling error with retry logic and exponential backoff.
   */
  private handleError(error: Error): void {
    this.state.retryCount++;

    if (this.state.retryCount >= this.config.polling.maxRetries) {
      this.stop();
      if (this.options.onError) {
        this.options.onError(new Error(`Max retries exceeded: ${error.message}`));
      }
      return;
    }

    this.state.currentInterval = Math.min(
      this.state.currentInterval * this.config.polling.backoffMultiplier,
      this.config.polling.maxBackoffMs
    );

    if (this.options.onError) {
      this.options.onError(error);
    }

    this.scheduleNextPoll();
  }

  /**
   * Schedule next poll with current interval.
   */
  private scheduleNextPoll(): void {
    if (!this.state.isPolling) {
      return;
    }

    this.state.timeoutId = window.setTimeout(() => {
      this.state.timeoutId = null;
      this.poll();
    }, this.state.currentInterval);
  }
}
