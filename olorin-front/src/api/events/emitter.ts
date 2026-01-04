/**
 * Type-Safe Event Emitter
 *
 * Constitutional Compliance:
 * - Type-safe event handling
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { EventEmitter } from '@api/events/emitter';
 */

/**
 * Event listener function
 */
export type EventListener<T = unknown> = (data: T) => void | Promise<void>;

/**
 * Event listener options
 */
export interface EventListenerOptions {
  once?: boolean;
  priority?: number;
}

/**
 * Internal event listener wrapper
 */
interface InternalEventListener<T = unknown> {
  listener: EventListener<T>;
  once: boolean;
  priority: number;
}

/**
 * Type-safe event emitter
 */
export class EventEmitter<TEvents extends Record<string, unknown> = Record<string, unknown>> {
  private listeners: Map<keyof TEvents, InternalEventListener[]> = new Map();
  private maxListeners: number = 10;

  /**
   * Subscribe to event
   */
  on<K extends keyof TEvents>(
    event: K,
    listener: EventListener<TEvents[K]>,
    options: EventListenerOptions = {}
  ): () => void {
    const internalListener: InternalEventListener<TEvents[K]> = {
      listener,
      once: options.once ?? false,
      priority: options.priority ?? 0
    };

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const eventListeners = this.listeners.get(event)!;
    eventListeners.push(internalListener as InternalEventListener);
    eventListeners.sort((a, b) => b.priority - a.priority);

    if (eventListeners.length > this.maxListeners) {
      console.warn(
        `Warning: Possible memory leak detected. ${eventListeners.length} listeners added for event "${String(event)}". ` +
        `Use setMaxListeners() to increase limit.`
      );
    }

    return () => this.off(event, listener);
  }

  /**
   * Subscribe to event (fires only once)
   */
  once<K extends keyof TEvents>(
    event: K,
    listener: EventListener<TEvents[K]>
  ): () => void {
    return this.on(event, listener, { once: true });
  }

  /**
   * Unsubscribe from event
   */
  off<K extends keyof TEvents>(
    event: K,
    listener: EventListener<TEvents[K]>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) {
      return;
    }

    const index = eventListeners.findIndex((l) => l.listener === listener);
    if (index !== -1) {
      eventListeners.splice(index, 1);
    }

    if (eventListeners.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Remove all listeners for event
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Emit event
   */
  async emit<K extends keyof TEvents>(event: K, data: TEvents[K]): Promise<void> {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.length === 0) {
      return;
    }

    const listenersToRemove: InternalEventListener<TEvents[K]>[] = [];

    for (const internalListener of eventListeners) {
      try {
        await internalListener.listener(data);

        if (internalListener.once) {
          listenersToRemove.push(internalListener);
        }
      } catch (error) {
        console.error(`Error in event listener for "${String(event)}":`, error);
      }
    }

    for (const listener of listenersToRemove) {
      this.off(event, listener.listener as EventListener<TEvents[K]>);
    }
  }

  /**
   * Emit event synchronously (does not wait for async listeners)
   */
  emitSync<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    this.emit(event, data).catch((error) => {
      console.error(`Unhandled error in async event listener for "${String(event)}":`, error);
    });
  }

  /**
   * Get listener count for event
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  /**
   * Get all event names
   */
  eventNames(): (keyof TEvents)[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Set maximum listeners per event
   */
  setMaxListeners(max: number): void {
    this.maxListeners = max;
  }

  /**
   * Get maximum listeners per event
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }
}

/**
 * Create event emitter instance
 */
export function createEventEmitter<TEvents extends Record<string, unknown> = Record<string, unknown>>(): EventEmitter<TEvents> {
  return new EventEmitter<TEvents>();
}
