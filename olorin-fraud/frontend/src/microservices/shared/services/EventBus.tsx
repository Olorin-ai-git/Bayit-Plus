import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import mitt, { Emitter } from 'mitt';

// Event types for type safety
export interface EventMap {
  // Authentication events
  'auth:login': { user: any; token: string };
  'auth:logout': { reason?: string };
  'auth:token-refresh': { token: string };

  // Investigation events
  'investigation:created': { id: string; type: 'autonomous' | 'manual' };
  'investigation:updated': { id: string; status: string; data: any };
  'investigation:completed': { id: string; results: any };
  'investigation:error': { id: string; error: string };

  // Agent events
  'agent:started': { agentId: string; investigationId: string };
  'agent:progress': { agentId: string; progress: number; message: string };
  'agent:completed': { agentId: string; results: any };
  'agent:error': { agentId: string; error: string };

  // Analytics events
  'analytics:data-updated': { type: string; data: any };
  'analytics:export-started': { format: string; filters: any };
  'analytics:export-completed': { downloadUrl: string };

  // Visualization events
  'visualization:filter-changed': { filters: any };
  'visualization:data-selected': { selection: any };
  'visualization:view-changed': { view: string; config: any };

  // Reporting events
  'report:generation-started': { reportId: string; type: string };
  'report:generation-progress': { reportId: string; progress: number };
  'report:generation-completed': { reportId: string; downloadUrl: string };
  'report:generation-error': { reportId: string; error: string };

  // System events
  'system:notification': { type: 'info' | 'success' | 'warning' | 'error'; message: string; duration?: number };
  'system:websocket-connected': { timestamp: string };
  'system:websocket-disconnected': { timestamp: string; reason?: string };
  'system:backend-status': { status: 'online' | 'offline' | 'degraded' };

  // Navigation events
  'navigation:service-changed': { from: string; to: string };
  'navigation:route-changed': { route: string; params: any };

  // Data synchronization events
  'data:sync-started': { entity: string };
  'data:sync-completed': { entity: string; count: number };
  'data:sync-error': { entity: string; error: string };
}

type EventBusType = Emitter<EventMap>;

const EventBusContext = createContext<EventBusType | undefined>(undefined);

interface EventBusProviderProps {
  children: ReactNode;
}

export const EventBusProvider: React.FC<EventBusProviderProps> = ({ children }) => {
  const eventBusRef = useRef<EventBusType>();

  if (!eventBusRef.current) {
    eventBusRef.current = mitt<EventMap>();
  }

  useEffect(() => {
    const eventBus = eventBusRef.current!;

    // Log all events in development
    if (process.env.NODE_ENV === 'development') {
      const logAllEvents = (type: string, event: any) => {
        console.log(`[EventBus] ${type}:`, event);
      };

      // Listen to all events for logging
      eventBus.on('*', logAllEvents);

      return () => {
        eventBus.off('*', logAllEvents);
      };
    }
  }, []);

  return (
    <EventBusContext.Provider value={eventBusRef.current}>
      {children}
    </EventBusContext.Provider>
  );
};

export const useEventBus = (): EventBusType => {
  const context = useContext(EventBusContext);
  if (context === undefined) {
    throw new Error('useEventBus must be used within an EventBusProvider');
  }
  return context;
};

// Convenience hooks for specific event types
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
  }, deps);
};

export const useEventEmitter = () => {
  const eventBus = useEventBus();

  return {
    emit: <K extends keyof EventMap>(type: K, event: EventMap[K]) => {
      eventBus.emit(type, event);
    },
    emitNotification: (type: 'info' | 'success' | 'warning' | 'error', message: string, duration?: number) => {
      eventBus.emit('system:notification', { type, message, duration });
    },
  };
};

// High-level event handlers for common patterns
export const useInvestigationEvents = (investigationId?: string) => {
  const { emit } = useEventEmitter();

  return {
    onInvestigationCreated: (id: string, type: 'autonomous' | 'manual') => {
      emit('investigation:created', { id, type });
    },
    onInvestigationUpdated: (id: string, status: string, data: any) => {
      emit('investigation:updated', { id, status, data });
    },
    onInvestigationCompleted: (id: string, results: any) => {
      emit('investigation:completed', { id, results });
    },
    onInvestigationError: (id: string, error: string) => {
      emit('investigation:error', { id, error });
    },
  };
};

export const useAgentEvents = () => {
  const { emit } = useEventEmitter();

  return {
    onAgentStarted: (agentId: string, investigationId: string) => {
      emit('agent:started', { agentId, investigationId });
    },
    onAgentProgress: (agentId: string, progress: number, message: string) => {
      emit('agent:progress', { agentId, progress, message });
    },
    onAgentCompleted: (agentId: string, results: any) => {
      emit('agent:completed', { agentId, results });
    },
    onAgentError: (agentId: string, error: string) => {
      emit('agent:error', { agentId, error });
    },
  };
};

export const useReportingEvents = () => {
  const { emit } = useEventEmitter();

  return {
    onReportStarted: (reportId: string, type: string) => {
      emit('report:generation-started', { reportId, type });
    },
    onReportProgress: (reportId: string, progress: number) => {
      emit('report:generation-progress', { reportId, progress });
    },
    onReportCompleted: (reportId: string, downloadUrl: string) => {
      emit('report:generation-completed', { reportId, downloadUrl });
    },
    onReportError: (reportId: string, error: string) => {
      emit('report:generation-error', { reportId, error });
    },
  };
};