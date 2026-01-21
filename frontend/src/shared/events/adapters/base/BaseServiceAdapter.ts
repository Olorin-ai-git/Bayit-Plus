/**
 * Base Service Adapter
 * Abstract base class for all microservice event adapters
 * Feature: Event-driven microservices communication
 */

import { EventBusManager, type EventMap } from '../../UnifiedEventBus';
import type { IServiceAdapter, EventSubscription, ServiceHealthStatus } from '../types/adapter-types';

/**
 * Abstract base class for service-specific event bus adapters
 * Provides common functionality for event subscription, emission, and messaging
 */
export abstract class BaseServiceAdapter implements IServiceAdapter {
  protected eventBus: EventBusManager;
  protected serviceName: string;
  protected subscriptions: EventSubscription[] = [];
  protected messageQueue: any[] = [];
  protected errorCount = 0;
  protected totalResponseTime = 0;
  protected requestCount = 0;
  protected lastHealthCheck = new Date();

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.eventBus = EventBusManager.getInstance();
    this.initialize();
  }

  /**
   * Initialize adapter and set up subscriptions
   * Must be implemented by subclasses
   */
  protected abstract initialize(): void;

  /**
   * Clean up all subscriptions
   */
  public cleanup(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
    this.messageQueue = [];
  }

  /**
   * Get service name
   */
  public getServiceName(): string {
    return this.serviceName;
  }

  /**
   * Get health status
   */
  public getHealthStatus(): ServiceHealthStatus {
    return {
      serviceName: this.serviceName,
      healthy: this.errorCount < 10,
      lastCheck: this.lastHealthCheck,
      errorCount: this.errorCount,
      averageResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0
    };
  }

  /**
   * Subscribe to event bus event
   */
  protected subscribeToEvent<K extends keyof EventMap>(
    event: K,
    handler: (data: EventMap[K]) => void
  ): void {
    const unsubscribe = this.eventBus.subscribe(event, handler, this.serviceName);
    this.subscriptions.push(unsubscribe);
  }

  /**
   * Emit event to event bus
   */
  protected emitEvent<K extends keyof EventMap>(
    event: K,
    data: EventMap[K]
  ): void {
    try {
      this.eventBus.emit(event, data);
      this.requestCount++;
    } catch (error) {
      this.errorCount++;
      console.error(`[${this.serviceName}] Failed to emit event ${event}:`, error);
    }
  }

  /**
   * Send message via polling - WebSocket removed per spec 005
   * Post spec 005: Messages are queued for HTTP polling delivery
   */
  protected sendMessage(type: string, payload: any, target?: string): void {
    const message = {
      type,
      payload,
      target,
      serviceName: this.serviceName,
      timestamp: new Date()
    };

    // Add to message queue for polling-based delivery
    this.messageQueue.push(message);

    // Trim queue if it exceeds max size (from config)
    const maxQueueSize = parseInt(
      process.env.REACT_APP_ADAPTER_MESSAGE_QUEUE_SIZE || '100',
      10
    );
    if (this.messageQueue.length > maxQueueSize) {
      this.messageQueue.shift(); // Remove oldest message
    }

    // Log if enabled
    const loggingEnabled = process.env.REACT_APP_ADAPTER_LOGGING_ENABLED === 'true';
    if (loggingEnabled) {
      console.log(`[${this.serviceName}] Message queued for polling: ${type}`, payload);
    }
  }

  /**
   * Get queued messages (for polling endpoint)
   */
  public getQueuedMessages(): any[] {
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    return messages;
  }

  /**
   * Update health check timestamp
   */
  protected updateHealthCheck(): void {
    this.lastHealthCheck = new Date();
  }

  /**
   * Record successful request
   */
  protected recordSuccess(responseTime: number): void {
    this.totalResponseTime += responseTime;
    this.requestCount++;
    this.updateHealthCheck();
  }

  /**
   * Record failed request
   */
  protected recordError(): void {
    this.errorCount++;
    this.updateHealthCheck();
  }
}
