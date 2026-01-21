/**
 * Event Bus Singleton for Microservices Communication
 *
 * Type-safe pub/sub pattern for inter-service communication.
 * Configuration via REACT_APP_EVENT_BUS_MAX_QUEUE_SIZE and REACT_APP_EVENT_BUS_ENABLE_LOGGING
 */

import { loadConfig } from '../../shared/config/appConfig';

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

interface EventSubscription {
  unsubscribe: () => void;
}

interface QueuedEvent<T = unknown> {
  event: string;
  data: T;
  timestamp: number;
}

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private wildcardListeners: Set<EventHandler> = new Set();
  private eventQueue: QueuedEvent[] = [];
  private readonly maxQueueSize: number;
  private readonly enableLogging: boolean;

  private constructor() {
    // Lazy-load configuration when EventBus is first instantiated
    const config = loadConfig();
    this.maxQueueSize = config.eventBus.maxQueueSize;
    this.enableLogging = config.eventBus.enableLogging;

    if (this.enableLogging) {
      console.log('[EventBus] Initialized', {
        maxQueueSize: this.maxQueueSize,
        enableLogging: this.enableLogging
      });
    }
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on<T = unknown>(event: string, handler: EventHandler<T>): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const typedHandler = handler as EventHandler;
    this.listeners.get(event)!.add(typedHandler);

    if (this.enableLogging) {
      console.log(`[EventBus] Subscribed: ${event}`);
    }

    return {
      unsubscribe: () => this.off(event, handler)
    };
  }

  public off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(handler as EventHandler);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
      if (this.enableLogging) {
        console.log(`[EventBus] Unsubscribed: ${event}`);
      }
    }
  }

  public onAll(handler: EventHandler): EventSubscription {
    this.wildcardListeners.add(handler);
    if (this.enableLogging) {
      console.log('[EventBus] Subscribed to all events');
    }
    return {
      unsubscribe: () => this.offAll(handler)
    };
  }

  public offAll(handler: EventHandler): void {
    this.wildcardListeners.delete(handler);
    if (this.enableLogging) {
      console.log('[EventBus] Unsubscribed from all events');
    }
  }

  public emit<T = unknown>(event: string, data: T): void {
    const timestamp = Date.now();

    if (this.enableLogging) {
      console.log(`[EventBus] Emit: ${event}`, data);
    }

    this.queueEvent(event, data, timestamp);

    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(handler => this.executeHandler(handler, data, event));
    }

    this.wildcardListeners.forEach(handler => this.executeHandler(handler, data, event));
  }

  private executeHandler(handler: EventHandler, data: unknown, event: string): void {
    try {
      const result = handler(data);
      if (result instanceof Promise) {
        result.catch(error => {
          console.error(`[EventBus] Async error for "${event}":`, error);
        });
      }
    } catch (error) {
      console.error(`[EventBus] Handler error for "${event}":`, error);
    }
  }

  private queueEvent<T>(event: string, data: T, timestamp: number): void {
    this.eventQueue.push({ event, data, timestamp });

    if (this.eventQueue.length > this.maxQueueSize) {
      const removed = this.eventQueue.shift();
      if (this.enableLogging) {
        console.warn('[EventBus] Queue full, removed:', removed?.event);
      }
    }
  }

  public getQueue(): ReadonlyArray<QueuedEvent> {
    return [...this.eventQueue];
  }

  public clearQueue(): void {
    this.eventQueue = [];
    if (this.enableLogging) {
      console.log('[EventBus] Queue cleared');
    }
  }

  public getStats(): {
    listenerCount: number;
    wildcardCount: number;
    queueSize: number;
    eventTypes: string[];
  } {
    return {
      listenerCount: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0),
      wildcardCount: this.wildcardListeners.size,
      queueSize: this.eventQueue.length,
      eventTypes: Array.from(this.listeners.keys())
    };
  }

  public removeAllListeners(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
    this.clearQueue();
    if (this.enableLogging) {
      console.log('[EventBus] All listeners removed');
    }
  }
}

/**
 * Lazy-initialized singleton instance
 *
 * Uses a Proxy to defer EventBus instantiation until first access.
 * This ensures Webpack's DefinePlugin has replaced process.env references
 * before loadConfig() is called in the constructor.
 */
let eventBusInstance: EventBus | null = null;

export const eventBus = new Proxy({} as EventBus, {
  get(_target, prop) {
    if (!eventBusInstance) {
      eventBusInstance = EventBus.getInstance();
    }
    const value = eventBusInstance[prop as keyof EventBus];
    // Bind methods to the instance to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(eventBusInstance);
    }
    return value;
  }
});

export default eventBus;
