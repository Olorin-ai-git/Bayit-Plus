/**
 * WebSocket React Hook
 * Provides React integration for WebSocket service with proper cleanup
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  websocketService,
  EventName,
  EventHandler,
  WebSocketEvents,
  ConnectionState
} from '../services/websocketService';
import { investigationKeys } from './useInvestigationQueries';
import { useInvestigationActions, useUIActions } from '../stores';

/**
 * Hook for WebSocket connection management
 */
export function useWebSocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    websocketService.getConnectionState()
  );

  useEffect(() => {
    // Update connection state periodically
    const interval = setInterval(() => {
      setConnectionState(websocketService.getConnectionState());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const connect = useCallback(() => {
    return websocketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    websocketService.reconnect();
  }, []);

  return {
    connectionState,
    isConnected: connectionState.connected,
    connect,
    disconnect,
    reconnect,
  };
}

/**
 * Hook for subscribing to WebSocket events
 */
export function useWebSocketEvent<T extends EventName>(
  event: T,
  handler: EventHandler<T>,
  dependencies: React.DependencyList = []
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler = (data: WebSocketEvents[T]) => {
      handlerRef.current(data);
    };

    const unsubscribe = websocketService.on(event, wrappedHandler);
    return unsubscribe;
  }, [event, ...dependencies]);
}

/**
 * Hook for managing investigation subscription
 */
export function useInvestigationSubscription(investigationId: string | null) {
  const previousIdRef = useRef<string | null>(null);

  useEffect(() => {
    const previousId = previousIdRef.current;

    // Unsubscribe from previous investigation
    if (previousId && previousId !== investigationId) {
      websocketService.unsubscribeFromInvestigation(previousId);
    }

    // Subscribe to new investigation
    if (investigationId && investigationId !== previousId) {
      websocketService.subscribeToInvestigation(investigationId);
    }

    previousIdRef.current = investigationId;

    // Cleanup on unmount
    return () => {
      if (investigationId) {
        websocketService.unsubscribeFromInvestigation(investigationId);
      }
    };
  }, [investigationId]);
}

/**
 * Hook for handling real-time investigation updates
 * Integrates with React Query cache invalidation
 */
export function useInvestigationUpdates(investigationId: string | null) {
  const queryClient = useQueryClient();
  const { setCurrentInvestigation, setLastRefresh } = useInvestigationActions();
  const { addNotification } = useUIActions();

  // Subscribe to investigation
  useInvestigationSubscription(investigationId);

  // Handle investigation updates
  useWebSocketEvent('investigation:updated', useCallback((data) => {
    if (data.id === investigationId) {
      // Update current investigation in store
      setCurrentInvestigation(data);

      // Invalidate React Query cache
      queryClient.setQueryData(investigationKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: investigationKeys.lists() });

      setLastRefresh(Date.now());
    }
  }, [investigationId, queryClient, setCurrentInvestigation, setLastRefresh]));

  // Handle phase changes
  useWebSocketEvent('investigation:phase_changed', useCallback((data) => {
    if (data.investigation_id === investigationId) {
      addNotification({
        type: 'info',
        title: 'Phase Changed',
        message: `Investigation moved to ${data.phase} phase`,
      });

      // Invalidate investigation details to fetch updated phase
      queryClient.invalidateQueries({
        queryKey: investigationKeys.detail(data.investigation_id)
      });
    }
  }, [investigationId, queryClient, addNotification]));

  // Handle status changes
  useWebSocketEvent('investigation:status_changed', useCallback((data) => {
    if (data.investigation_id === investigationId) {
      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `Investigation status changed to ${data.status}`,
      });

      // Invalidate investigation details and lists
      queryClient.invalidateQueries({
        queryKey: investigationKeys.detail(data.investigation_id)
      });
      queryClient.invalidateQueries({ queryKey: investigationKeys.lists() });
    }
  }, [investigationId, queryClient, addNotification]));

  // Handle new evidence
  useWebSocketEvent('evidence:added', useCallback((data) => {
    if (data.investigation_id === investigationId) {
      addNotification({
        type: 'info',
        title: 'New Evidence',
        message: `New evidence added: ${data.evidence.summary}`,
        autoHide: false,
      });

      // Invalidate evidence cache
      queryClient.invalidateQueries({
        queryKey: investigationKeys.evidence(data.investigation_id)
      });
    }
  }, [investigationId, queryClient, addNotification]));

  // Handle domain analysis completion
  useWebSocketEvent('domain:analysis_complete', useCallback((data) => {
    if (data.investigation_id === investigationId) {
      addNotification({
        type: 'success',
        title: 'Analysis Complete',
        message: `${data.domain.name} domain analysis completed`,
      });

      // Invalidate domain cache
      queryClient.invalidateQueries({
        queryKey: investigationKeys.domains(data.investigation_id)
      });
    }
  }, [investigationId, queryClient, addNotification]));

  // Handle progress updates
  useWebSocketEvent('progress:update', useCallback((data) => {
    if (data.investigation_id === investigationId) {
      // Update progress in real-time (could integrate with a progress store)
      console.log(`Progress update: ${data.progress}% - ${data.message}`);
    }
  }, [investigationId]));

  // Handle investigation errors
  useWebSocketEvent('error:investigation', useCallback((data) => {
    if (data.investigation_id === investigationId) {
      addNotification({
        type: 'error',
        title: 'Investigation Error',
        message: data.error,
        autoHide: false,
      });
    }
  }, [investigationId, addNotification]));
}

/**
 * Hook for handling system-wide WebSocket events
 */
export function useSystemUpdates() {
  const { addNotification } = useUIActions();

  // Handle system maintenance notifications
  useWebSocketEvent('system:maintenance', useCallback((data) => {
    addNotification({
      type: 'warning',
      title: 'System Maintenance',
      message: data.message,
      autoHide: false,
    });
  }, [addNotification]));

  // Handle investigation creation (for monitoring multiple investigations)
  useWebSocketEvent('investigation:created', useCallback((data) => {
    addNotification({
      type: 'info',
      title: 'New Investigation',
      message: `Investigation ${data.id} created for ${data.entity.type}: ${data.entity.value}`,
    });
  }, [addNotification]));
}

/**
 * Complete hook that sets up all WebSocket integrations
 */
export function useWebSocketIntegration(investigationId: string | null) {
  const webSocket = useWebSocket();

  useInvestigationUpdates(investigationId);
  useSystemUpdates();

  // Auto-connect when component mounts
  useEffect(() => {
    if (!webSocket.isConnected) {
      webSocket.connect().catch((error) => {
        console.error('Failed to connect to WebSocket:', error);
      });
    }

    // Cleanup on unmount
    return () => {
      if (investigationId) {
        websocketService.unsubscribeFromInvestigation(investigationId);
      }
    };
  }, [webSocket, investigationId]);

  return webSocket;
}