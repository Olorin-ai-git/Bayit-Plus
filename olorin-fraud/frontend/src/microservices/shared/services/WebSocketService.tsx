import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useEventEmitter } from './EventBus';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  id?: string;
}

export interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  lastMessage: WebSocketMessage | null;
  send: (message: WebSocketMessage) => void;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  url = process.env.REACT_APP_WS_URL || (() => {
    throw new Error('CRITICAL: REACT_APP_WS_URL is not set. Set it in your .env file. No fallback allowed for security.');
  })(),
  autoConnect = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 10,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const { emit } = useEventEmitter();

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        emit('system:websocket-connected', { timestamp: new Date().toISOString() });
        console.log('[WebSocket] Connected to:', url);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Emit specific events based on message type
          switch (message.type) {
            case 'investigation:update':
              emit('investigation:updated', message.payload);
              break;
            case 'agent:progress':
              emit('agent:progress', message.payload);
              break;
            case 'agent:completed':
              emit('agent:completed', message.payload);
              break;
            case 'agent:error':
              emit('agent:error', message.payload);
              break;
            case 'report:progress':
              emit('report:generation-progress', message.payload);
              break;
            case 'report:completed':
              emit('report:generation-completed', message.payload);
              break;
            case 'system:notification':
              emit('system:notification', message.payload);
              break;
            default:
              console.log('[WebSocket] Received message:', message);
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', event.data, error);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);

        const reason = event.reason || 'Connection closed';
        emit('system:websocket-disconnected', {
          timestamp: new Date().toISOString(),
          reason
        });

        console.log('[WebSocket] Disconnected:', reason);

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          scheduleReconnect();
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Maximum reconnection attempts reached');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnectionError('WebSocket connection error');
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      setConnectionError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError(null);
    reconnectAttemptsRef.current = 0;
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current += 1;
    const delay = reconnectInterval * Math.min(reconnectAttemptsRef.current, 5); // Exponential backoff

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  };

  const reconnect = () => {
    disconnect();
    setTimeout(connect, 1000); // Brief delay before reconnecting
  };

  const send = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageWithTimestamp = {
          ...message,
          timestamp: new Date().toISOString(),
          id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };

        wsRef.current.send(JSON.stringify(messageWithTimestamp));
        console.log('[WebSocket] Sent message:', messageWithTimestamp);
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error);
        emit('system:notification', {
          type: 'error',
          message: 'Failed to send WebSocket message',
        });
      }
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
      emit('system:notification', {
        type: 'warning',
        message: 'WebSocket not connected - message not sent',
      });
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && !isConnecting) {
        console.log('[WebSocket] Page became visible, attempting to reconnect');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, isConnecting]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('[WebSocket] Network online, attempting to reconnect');
      if (!isConnected && !isConnecting) {
        connect();
      }
    };

    const handleOffline = () => {
      console.log('[WebSocket] Network offline');
      emit('system:notification', {
        type: 'warning',
        message: 'Network connection lost',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isConnected, isConnecting]);

  const value: WebSocketContextType = {
    isConnected,
    isConnecting,
    connectionError,
    lastMessage,
    send,
    connect,
    disconnect,
    reconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Convenience hooks for specific WebSocket patterns
export const useWebSocketSubscription = (messageType: string, handler: (payload: any) => void) => {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === messageType) {
      handler(lastMessage.payload);
    }
  }, [lastMessage, messageType, handler]);
};

export const useWebSocketSender = () => {
  const { send } = useWebSocket();

  return {
    sendInvestigationCommand: (investigationId: string, command: string, params?: any) => {
      send({
        type: 'investigation:command',
        payload: {
          investigationId,
          command,
          params,
        },
        timestamp: new Date().toISOString(),
      });
    },
    sendAgentCommand: (agentId: string, command: string, params?: any) => {
      send({
        type: 'agent:command',
        payload: {
          agentId,
          command,
          params,
        },
        timestamp: new Date().toISOString(),
      });
    },
    sendSystemMessage: (type: string, payload: any) => {
      send({
        type: `system:${type}`,
        payload,
        timestamp: new Date().toISOString(),
      });
    },
  };
};