/**
 * WebSocket Client Wrapper
 *
 * Constitutional Compliance:
 * - Configuration-driven WebSocket URLs
 * - Type-safe event handling
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { WebSocketClient } from '@api/websocket/client';
 */

import { getApiConfig } from '../config';

/**
 * WebSocket connection state
 */
export enum WebSocketState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR'
}

/**
 * WebSocket event types
 */
export interface WebSocketEvents {
  open: Event;
  close: CloseEvent;
  error: Event;
  message: MessageEvent;
}

/**
 * WebSocket message handler
 */
export type MessageHandler<T = unknown> = (data: T) => void;

/**
 * WebSocket event handler
 */
export type EventHandler<K extends keyof WebSocketEvents> = (event: WebSocketEvents[K]) => void;

/**
 * WebSocket client configuration
 */
export interface WebSocketClientConfig {
  url?: string;
  protocols?: string | string[];
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

/**
 * Type-safe WebSocket client
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private protocols?: string | string[];
  private reconnect: boolean;
  private reconnectDelay: number;
  private maxReconnectAttempts: number;
  private heartbeatInterval: number;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private eventHandlers: Map<keyof WebSocketEvents, Set<EventHandler<any>>> = new Map();
  private state: WebSocketState = WebSocketState.DISCONNECTED;

  constructor(config: WebSocketClientConfig = {}) {
    this.url = config.url ?? this.getDefaultWebSocketUrl();
    this.protocols = config.protocols;
    this.reconnect = config.reconnect ?? true;
    this.reconnectDelay = config.reconnectDelay ?? 3000;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
    this.heartbeatInterval = config.heartbeatInterval ?? 30000;
  }

  private getDefaultWebSocketUrl(): string {
    const apiConfig = getApiConfig();
    const apiUrl = apiConfig.apiBaseUrl;
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    return `${wsUrl}/ws`;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.state = WebSocketState.CONNECTING;
    this.ws = new WebSocket(this.url, this.protocols);

    this.ws.onopen = (event) => {
      this.state = WebSocketState.CONNECTED;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit('open', event);
    };

    this.ws.onclose = (event) => {
      this.state = WebSocketState.DISCONNECTED;
      this.stopHeartbeat();
      this.emit('close', event);

      if (this.reconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      this.state = WebSocketState.ERROR;
      this.emit('error', event);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
      this.emit('message', event);
    };
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.reconnect = false;
    this.clearReconnectTimeout();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state = WebSocketState.DISCONNECTED;
  }

  /**
   * Send message to server
   */
  send<T = unknown>(type: string, data: T): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const message = JSON.stringify({ type, data });
    this.ws.send(message);
  }

  /**
   * Subscribe to message type
   */
  on<T = unknown>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler as MessageHandler);

    return () => this.off(type, handler);
  }

  /**
   * Unsubscribe from message type
   */
  off<T = unknown>(type: string, handler: MessageHandler<T>): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler as MessageHandler);
    }
  }

  /**
   * Subscribe to WebSocket event
   */
  addEventListener<K extends keyof WebSocketEvents>(
    event: K,
    handler: EventHandler<K>
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);

    return () => this.removeEventListener(event, handler);
  }

  /**
   * Unsubscribe from WebSocket event
   */
  removeEventListener<K extends keyof WebSocketEvents>(
    event: K,
    handler: EventHandler<K>
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === WebSocketState.CONNECTED;
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      const { type, data } = message;

      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.forEach((handler) => handler(data));
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private emit<K extends keyof WebSocketEvents>(event: K, data: WebSocketEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimeout();

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping', { timestamp: Date.now() });
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

/**
 * Create WebSocket client instance
 */
export function createWebSocketClient(config?: WebSocketClientConfig): WebSocketClient {
  return new WebSocketClient(config);
}

let defaultWebSocketInstance: WebSocketClient | null = null;

/**
 * Get or create default WebSocket client instance
 */
export function getWebSocketClient(): WebSocketClient {
  if (!defaultWebSocketInstance) {
    defaultWebSocketInstance = createWebSocketClient();
  }
  return defaultWebSocketInstance;
}

/**
 * Reset default WebSocket client instance
 */
export function resetWebSocketClient(): void {
  if (defaultWebSocketInstance) {
    defaultWebSocketInstance.disconnect();
    defaultWebSocketInstance = null;
  }
}
