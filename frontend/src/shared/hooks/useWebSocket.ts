/**
 * Unified WebSocket Hook
 * Consolidates WebSocket functionality into a simple React hook
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven WebSocket URLs
 * - Type-safe event handling
 * - No hardcoded values
 * - Proper cleanup and resource management
 *
 * Usage:
 *   const { send, on, isConnected, state } = useWebSocket({
 *     autoConnect: true,
 *     onOpen: () => console.log('Connected'),
 *     onError: (err) => console.error('Error:', err)
 *   });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketClient, WebSocketState } from '../../api/websocket/client';
import type { MessageHandler } from '../../api/websocket/client';

/**
 * WebSocket hook configuration
 */
export interface UseWebSocketConfig {
  /** WebSocket URL (defaults to configured API WebSocket endpoint) */
  url?: string;
  /** Protocols to use */
  protocols?: string | string[];
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Enable automatic reconnection */
  reconnect?: boolean;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
  /** Callback fired when connection opens */
  onOpen?: () => void;
  /** Callback fired when connection closes */
  onClose?: (event: CloseEvent) => void;
  /** Callback fired on connection error */
  onError?: (event: Event) => void;
  /** Callback fired on message receipt */
  onMessage?: (event: MessageEvent) => void;
}

/**
 * WebSocket hook return type
 */
export interface UseWebSocketReturn {
  /** Send typed message to server */
  send: <T = unknown>(type: string, data: T) => void;
  /** Subscribe to message type */
  on: <T = unknown>(type: string, handler: MessageHandler<T>) => () => void;
  /** Unsubscribe from message type */
  off: <T = unknown>(type: string, handler: MessageHandler<T>) => void;
  /** Current connection state */
  state: WebSocketState;
  /** Connection status boolean */
  isConnected: boolean;
  /** Manually connect */
  connect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** WebSocket client instance (advanced usage) */
  client: WebSocketClient | null;
}

/**
 * Unified WebSocket React hook
 * Provides a simple interface to WebSocket functionality
 */
export function useWebSocket(config: UseWebSocketConfig = {}): UseWebSocketReturn {
  const {
    url,
    protocols,
    autoConnect = true,
    reconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    onOpen,
    onClose,
    onError,
    onMessage
  } = config;

  const [state, setState] = useState<WebSocketState>(WebSocketState.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<WebSocketClient | null>(null);

  // Initialize WebSocket client
  useEffect(() => {
    const client = new WebSocketClient({
      url,
      protocols,
      reconnect,
      reconnectDelay,
      maxReconnectAttempts,
      heartbeatInterval
    });

    clientRef.current = client;

    // Set up event listeners
    const unsubscribeOpen = client.addEventListener('open', (event) => {
      setState(WebSocketState.CONNECTED);
      setIsConnected(true);
      onOpen?.();
    });

    const unsubscribeClose = client.addEventListener('close', (event) => {
      setState(WebSocketState.DISCONNECTED);
      setIsConnected(false);
      onClose?.(event);
    });

    const unsubscribeError = client.addEventListener('error', (event) => {
      setState(WebSocketState.ERROR);
      setIsConnected(false);
      onError?.(event);
    });

    const unsubscribeMessage = onMessage
      ? client.addEventListener('message', onMessage)
      : () => {};

    // Auto-connect if enabled
    if (autoConnect) {
      client.connect();
    }

    // Cleanup on unmount
    return () => {
      unsubscribeOpen();
      unsubscribeClose();
      unsubscribeError();
      unsubscribeMessage();
      client.disconnect();
      clientRef.current = null;
    };
  }, [
    url,
    protocols,
    autoConnect,
    reconnect,
    reconnectDelay,
    maxReconnectAttempts,
    heartbeatInterval,
    onOpen,
    onClose,
    onError,
    onMessage
  ]);

  // Send message
  const send = useCallback(<T = unknown>(type: string, data: T) => {
    if (!clientRef.current) {
      throw new Error('WebSocket client not initialized');
    }
    clientRef.current.send(type, data);
  }, []);

  // Subscribe to message type
  const on = useCallback(<T = unknown>(type: string, handler: MessageHandler<T>) => {
    if (!clientRef.current) {
      throw new Error('WebSocket client not initialized');
    }
    return clientRef.current.on(type, handler);
  }, []);

  // Unsubscribe from message type
  const off = useCallback(<T = unknown>(type: string, handler: MessageHandler<T>) => {
    if (!clientRef.current) {
      throw new Error('WebSocket client not initialized');
    }
    clientRef.current.off(type, handler);
  }, []);

  // Manually connect
  const connect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.connect();
    }
  }, []);

  // Manually disconnect
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  return {
    send,
    on,
    off,
    state,
    isConnected,
    connect,
    disconnect,
    client: clientRef.current
  };
}
