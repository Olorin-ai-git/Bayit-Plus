/**
 * CVPlus Event Bus for Cross-Layer Communication
 * Enables decoupled communication between modules without direct imports
  */

export interface EventHandler<T = any> {
  (data: T): void | Promise<void>;
}

export interface EventBus {
  emit<T = any>(event: string, data: T): Promise<void>;
  on<T = any>(event: string, handler: EventHandler<T>): () => void;
  off(event: string, handler: EventHandler): void;
  once<T = any>(event: string, handler: EventHandler<T>): Promise<T>;
  clear(): void;
}

export class CVPlusEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  async emit<T = any>(event: string, data: T): Promise<void> {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) return;

    const promises = Array.from(eventHandlers).map(handler => 
      Promise.resolve(handler(data))
    );

    await Promise.all(promises);
  }

  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    this.handlers.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  async once<T = any>(event: string, handler: EventHandler<T>): Promise<T> {
    return new Promise<T>((resolve) => {
      const wrappedHandler = (data: T) => {
        this.off(event, wrappedHandler);
        handler(data);
        resolve(data);
      };
      this.on(event, wrappedHandler);
    });
  }

  clear(): void {
    this.handlers.clear();
  }
}

// Global event bus instance
export const eventBus = new CVPlusEventBus();

// Event constants for cross-layer communication
export const CVPlusEvents = {
  // Subscription events
  SUBSCRIPTION_CHECK_REQUESTED: 'subscription.check.requested',
  SUBSCRIPTION_CHECK_RESPONSE: 'subscription.check.response',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  
  // Feature access events  
  FEATURE_ACCESS_REQUESTED: 'feature.access.requested',
  FEATURE_ACCESS_RESPONSE: 'feature.access.response',
  FEATURE_USAGE_TRACKED: 'feature.usage.tracked',
  
  // Analytics events
  ANALYTICS_EVENT_TRACKED: 'analytics.event.tracked',
  ANALYTICS_REPORT_REQUESTED: 'analytics.report.requested',
  
  // Payment events
  PAYMENT_PROCESSED: 'payment.processed',
  PAYMENT_FAILED: 'payment.failed',
  
  // System events
  MODULE_INITIALIZED: 'module.initialized',
  MODULE_ERROR: 'module.error'
} as const;

export type CVPlusEventType = keyof typeof CVPlusEvents;

// Helper functions for common event patterns
export const emitSubscriptionCheck = async (userId: string, feature: string) => {
  await eventBus.emit(CVPlusEvents.SUBSCRIPTION_CHECK_REQUESTED, {
    userId,
    feature,
    timestamp: Date.now()
  });
};

export const onSubscriptionResponse = (handler: EventHandler<{ userId: string; hasAccess: boolean; feature: string }>) => {
  return eventBus.on(CVPlusEvents.SUBSCRIPTION_CHECK_RESPONSE, handler);
};

export const emitFeatureAccess = async (userId: string, feature: string, granted: boolean) => {
  await eventBus.emit(CVPlusEvents.FEATURE_ACCESS_RESPONSE, {
    userId,
    feature,
    granted,
    timestamp: Date.now()
  });
};

export const trackAnalyticsEvent = async (event: string, data: any) => {
  await eventBus.emit(CVPlusEvents.ANALYTICS_EVENT_TRACKED, {
    event,
    data,
    timestamp: Date.now()
  });
};