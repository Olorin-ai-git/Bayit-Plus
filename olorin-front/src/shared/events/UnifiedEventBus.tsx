/**
 * Unified Event Bus for Olorin Platform
 *
 * Provides both React Context and Singleton patterns for maximum flexibility.
 * Consolidates all event types across microservices and core functionality.
 *
 * Usage:
 * - React Components: useEventBus() hook or useEventListener() hook
 * - Non-React Code: eventBusInstance singleton
 * - App Wrapper: <EventBusProvider> at root level
 */

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import mitt, { Emitter } from 'mitt';

/**
 * Comprehensive Event Map - All Event Types Across Platform
 */
export interface EventMap {
  // ==================== INVESTIGATION EVENTS ====================

  // Generic Investigation Events
  'investigation:created': { id: string; type: 'structured' | 'hybrid' | 'manual' };
  'investigation:started': { investigation: any };
  'investigation:updated': { id: string; status: string; data: any };
  'investigation:completed': { id: string; results: any };
  'investigation:error': { id: string; error: string };
  'investigation:progress:updated': { investigationId: string; progress: number; phase?: string };
  'investigation:tool:executed': { investigationId: string; toolId: string; result: any };
  'investigation:evidence:added': { investigationId: string; evidence: any };
  'investigation:workflow:updated': { investigationId: string; step: number };
  'investigation:risk:calculated': { investigationId: string; score: number; factors: any[] };

  // Structured Investigation Events
  'auto:investigation:started': { investigation: any };
  'auto:investigation:completed': { investigationId: string; result: any };
  'auto:investigation:escalated': { id: string; reason: string; targetService: 'manual' };
  'auto:ai:decision': { investigationId: string; decision: any };
  'auto:risk:calculated': { investigationId: string; score: number; factors: any[] };

  // Manual Investigation Events
  'manual:investigation:started': { investigation: any };
  'manual:investigation:completed': { investigationId: string; result: any };
  'manual:workflow:updated': { investigationId: string; step: number };
  'manual:evidence:added': { investigationId: string; evidence: any };
  'manual:collaboration:invited': { investigationId: string; collaborator: any };

  // ==================== AGENT EVENTS ====================

  'agent:started': { agentId: string; investigationId: string };
  'agent:progress': { agentId: string; progress: number; message: string };
  'agent:completed': { agentId: string; results: any };
  'agent:error': { agentId: string; error: string };
  'agent:execution:started': { agentId: string; execution: any };
  'agent:execution:completed': { agentId: string; executionId: string; result: any };
  'agent:performance:updated': { agentId: string; metrics: any };
  'agent:anomaly:detected': { agentId: string; anomaly: any };

  // ==================== SYSTEM EVENTS ====================

  'system:notification': {
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    duration?: number;
  };
  'system:websocket-connected': { timestamp: string };
  'system:websocket-disconnected': { timestamp: string; reason?: string };
  'system:backend-status': { status: 'online' | 'offline' | 'degraded' };
  'system:polling-connected': { timestamp: Date };
  'system:polling-disconnected': { timestamp: Date };
  'system:polling-error': { error: Error };
  'system:polling-retry': { attempt: number; maxAttempts: number };

  // ==================== UI NOTIFICATION EVENTS ====================

  'ui:notification:show': {
    notification: {
      id: string;
      type: 'info' | 'success' | 'warning' | 'error';
      title?: string;
      message: string;
      duration?: number;
      persistent?: boolean;
      actions?: Array<{
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary';
      }>;
    };
  };
  'ui:navigation:changed': { route: string; user?: any };
  'ui:theme:changed': { theme: any };
  'ui:modal:opened': { modalId: string; data?: any };
  'ui:modal:closed': { modalId: string };

  // ==================== AUTHENTICATION EVENTS ====================

  'auth:login': { user: any; token: string };
  'auth:logout': { reason?: string };
  'auth:token-refresh': { token: string };

  // ==================== ANALYTICS EVENTS ====================

  'analytics:data-updated': { type: string; data: any };
  'analytics:export-started': { format: string; filters: any };
  'analytics:export-completed': { downloadUrl: string };

  // ==================== VISUALIZATION EVENTS ====================

  'visualization:filter-changed': { filters: any };
  'visualization:data-selected': { selection: any };
  'visualization:view-changed': { view: string; config: any };
  'viz:graph:updated': { investigationId: string; nodes: any[]; edges: any[] };
  'viz:map:location:added': { investigationId: string; location: any };
  'viz:chart:data:updated': { chartId: string; data: any };

  // ==================== REPORTING EVENTS ====================

  'report:generation-started': { reportId: string; type: string };
  'report:generation-progress': { reportId: string; progress: number };
  'report:generation-completed': { reportId: string; downloadUrl: string };
  'report:generation-error': { reportId: string; error: string };
  'report:generated': { reportId: string; type: string; url: string };
  'report:export:started': { reportId: string; format: string };
  'report:export:completed': { reportId: string; downloadUrl: string };

  // ==================== RAG INTELLIGENCE EVENTS ====================

  'rag:query:executed': { queryId: string; query: string; results: any[] };
  'rag:knowledge:updated': { source: string; timestamp: Date };
  'rag:insight:generated': { investigationId: string; insight: any };

  // ==================== NAVIGATION EVENTS ====================

  'navigation:service-changed': { from: string; to: string };
  'navigation:route-changed': { route: string; params: any };

  // ==================== DATA SYNCHRONIZATION EVENTS ====================

  'data:sync-started': { entity: string };
  'data:sync-completed': { entity: string; count: number };
  'data:sync-error': { entity: string; error: string };

  // ==================== SERVICE HEALTH EVENTS ====================

  'service:health:check': { service: string; status: any };
  'service:ready': { service: string; timestamp: Date };
  'service:error': { service: string; error: Error };
  'service:recovery': { service: string; timestamp: Date };

  // ==================== DESIGN SYSTEM EVENTS ====================

  'design:tokens:updated': { tokens: any; source: string };
  'design:component:generated': { component: any };
  'design:figma:synced': { components: string[]; timestamp: Date };
  'design:validation:failed': { componentId: string; errors: any[] };

  // ==================== TEST EVENTS ====================

  'test:suite:started': { suiteId: string; type: string };
  'test:case:passed': { testId: string; duration: number };
  'test:case:failed': { testId: string; error: Error; screenshot?: string };
  'test:visual:regression': { componentId: string; diff: number };
  'test:coverage:updated': { service: string; coverage: number };
}

type EventBusType = Emitter<EventMap>;

// ==================== SINGLETON INSTANCE ====================

/**
 * Global singleton EventBus instance (for non-React code)
 * Use this in services, utilities, and other non-React contexts
 */
export const eventBusInstance: EventBusType = mitt<EventMap>();

/**
 * Legacy export for backward compatibility
 */
export const eventBus = eventBusInstance;

// ==================== REACT CONTEXT ====================

const EventBusContext = createContext<EventBusType | undefined>(undefined);

interface EventBusProviderProps {
  children: ReactNode;
}

/**
 * EventBus Provider Component
 * Wrap your app with this to enable EventBus hooks
 */
export const EventBusProvider: React.FC<EventBusProviderProps> = ({ children }) => {
  const eventBusRef = useRef<EventBusType>();

  if (!eventBusRef.current) {
    // Use the same singleton instance to ensure event consistency
    eventBusRef.current = eventBusInstance;
  }

  // Event logging disabled to reduce console noise
  // Uncomment below to enable event logging in development
  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'development') {
  //     const logAllEvents = (type: string, event: any) => {
  //       console.debug(`[EventBus] ${type}:`, event);
  //     };
  //     eventBusInstance.on('*', logAllEvents);
  //     return () => {
  //       eventBusInstance.off('*', logAllEvents);
  //     };
  //   }
  // }, []);

  return (
    <EventBusContext.Provider value={eventBusRef.current}>
      {children}
    </EventBusContext.Provider>
  );
};

/**
 * Hook to get EventBus instance in React components
 * @throws Error if used outside EventBusProvider
 */
export const useEventBus = (): EventBusType => {
  const context = useContext(EventBusContext);
  if (context === undefined) {
    throw new Error('useEventBus must be used within an EventBusProvider');
  }
  return context;
};

/**
 * Hook to listen to specific events in React components
 * Automatically handles cleanup on unmount
 */
export const useEventListener = <K extends keyof EventMap>(
  type: K,
  handler: (event: EventMap[K]) => void,
  deps: React.DependencyList = []
) => {
  const eventBus = useEventBus();

  useEffect(() => {
    eventBus.on(type, handler);
    return () => {
      eventBus.off(type, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventBus, type, ...deps]);
};

/**
 * Hook to emit events from React components
 */
export const useEventEmitter = () => {
  const eventBus = useEventBus();

  return {
    emit: <K extends keyof EventMap>(type: K, event: EventMap[K]) => {
      eventBus.emit(type, event);
    },
    emitNotification: (
      type: 'info' | 'success' | 'warning' | 'error',
      message: string,
      title?: string,
      duration?: number
    ) => {
      eventBus.emit('ui:notification:show', {
        notification: {
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type,
          title,
          message,
          duration,
        },
      });
    },
  };
};

// ==================== EVENT BUS MANAGER ====================

/**
 * Event Bus Manager for advanced usage
 * Provides error handling, cleanup tracking, and statistics
 */
export class EventBusManager {
  private static instance: EventBusManager;
  private listeners: Map<string, Function[]> = new Map();

  public static getInstance(): EventBusManager {
    if (!EventBusManager.instance) {
      EventBusManager.instance = new EventBusManager();
    }
    return EventBusManager.instance;
  }

  /**
   * Subscribe to events with automatic cleanup tracking
   */
  public subscribe<K extends keyof EventMap>(
    event: K,
    handler: (data: EventMap[K]) => void,
    component?: string
  ): () => void {
    const wrappedHandler = (data: EventMap[K]) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[EventBus] Error in event handler for ${event}:`, error);
        eventBusInstance.emit('service:error', {
          service: component || 'unknown',
          error: error as Error,
        });
      }
    };

    eventBusInstance.on(event, wrappedHandler);

    // Track listeners for cleanup
    const listeners = this.listeners.get(component || 'global') || [];
    listeners.push(() => eventBusInstance.off(event, wrappedHandler));
    this.listeners.set(component || 'global', listeners);

    // Return unsubscribe function
    return () => {
      eventBusInstance.off(event, wrappedHandler);
      const componentListeners = this.listeners.get(component || 'global') || [];
      const index = componentListeners.findIndex(l => l === wrappedHandler);
      if (index > -1) {
        componentListeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit events with error handling
   */
  public emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    try {
      eventBusInstance.emit(event, data);
    } catch (error) {
      console.error(`[EventBus] Error emitting event ${event}:`, error);
    }
  }

  /**
   * Cleanup all listeners for a component
   */
  public cleanup(component: string): void {
    const listeners = this.listeners.get(component) || [];
    listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.delete(component);
  }

  /**
   * Get event bus statistics
   */
  public getStats(): { listeners: number; components: number } {
    const components = Array.from(this.listeners.keys());
    const totalListeners = components.reduce(
      (total, component) => total + (this.listeners.get(component)?.length || 0),
      0
    );

    return {
      listeners: totalListeners,
      components: components.length,
    };
  }
}

// ==================== UTILITY HELPERS ====================

/**
 * Helper functions for common UI events
 */
export const UIEvents = {
  showNotification: (
    type: 'info' | 'success' | 'warning' | 'error',
    message: string,
    title?: string,
    duration?: number
  ) => {
    eventBusInstance.emit('ui:notification:show', {
      notification: {
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message,
        duration,
      },
    });
  },

  changeTheme: (theme: any) => eventBusInstance.emit('ui:theme:changed', { theme }),

  navigate: (route: string, user?: any) =>
    eventBusInstance.emit('ui:navigation:changed', { route, user }),

  openModal: (modalId: string, data?: any) =>
    eventBusInstance.emit('ui:modal:opened', { modalId, data }),

  closeModal: (modalId: string) => eventBusInstance.emit('ui:modal:closed', { modalId }),
};

/**
 * Helper functions for investigation events
 */
export const InvestigationEvents = {
  created: (id: string, type: 'structured' | 'hybrid' | 'manual') =>
    eventBusInstance.emit('investigation:created', { id, type }),

  updated: (id: string, status: string, data: any) =>
    eventBusInstance.emit('investigation:updated', { id, status, data }),

  completed: (id: string, results: any) =>
    eventBusInstance.emit('investigation:completed', { id, results }),

  error: (id: string, error: string) =>
    eventBusInstance.emit('investigation:error', { id, error }),

  progress: (investigationId: string, progress: number, phase?: string) =>
    eventBusInstance.emit('investigation:progress:updated', { investigationId, progress, phase }),
};

/**
 * Export default for backward compatibility
 */
export default eventBusInstance;
