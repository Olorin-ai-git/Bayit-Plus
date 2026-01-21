/**
 * WebSocket Manager - Real-time Communication
 *
 * Manages WebSocket connections for real-time updates from backend.
 * Integrates with Event Bus for seamless event distribution.
 */

import { eventBusInstance } from '../events/UnifiedEventBus';
import type { WebSocketEvents } from '../types/events.types';

type WebSocketEventKey = keyof WebSocketEvents;

interface WebSocketConfig {
  url: string;
  reconnectEnabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * WebSocket Manager for real-time backend communication
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventBus = eventBusInstance;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectEnabled: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      debug: false,
      ...config
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.state === 'connected' || this.state === 'connecting') {
      if (this.config.debug) {
        console.log('[WebSocket] Already connected or connecting');
      }
      return;
    }

    this.state = 'connecting';
    if (this.config.debug) {
      console.log(`[WebSocket] Connecting to ${this.config.url}`);
    }

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.handleConnectionError();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.config.debug) {
      console.log('[WebSocket] Disconnecting');
    }

    this.clearTimers();
    this.config.reconnectEnabled = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state = 'disconnected';
  }

  /**
   * Send message to WebSocket server
   */
  send(data: any): void {
    if (!this.ws || this.state !== 'connected') {
      console.warn('[WebSocket] Cannot send message - not connected');
      return;
    }

    try {
      const message = JSON.stringify(data);
      this.ws.send(message);

      if (this.config.debug) {
        console.log('[WebSocket] Sent:', data);
      }
    } catch (error) {
      console.error('[WebSocket] Send error:', error);
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.state = 'connected';
      this.reconnectAttempts = 0;

      if (this.config.debug) {
        console.log('[WebSocket] Connected');
      }

      this.startHeartbeat();

      // Emit connection event
      this.eventBus.emit('ui:notification', {
        notification: {
          id: `ws-connected-${Date.now()}`,
          type: 'success',
          title: 'Connected',
          message: 'Real-time connection established',
          duration: 3000
        }
      });
    };

    this.ws.onclose = (event) => {
      if (this.config.debug) {
        console.log('[WebSocket] Closed:', event.code, event.reason);
      }

      this.clearTimers();
      this.state = 'disconnected';

      if (this.config.reconnectEnabled) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      this.handleConnectionError();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      if (this.config.debug) {
        console.log('[WebSocket] Received:', message);
      }

      // Route message to appropriate event
      this.routeMessage(message);
    } catch (error) {
      console.error('[WebSocket] Message parsing error:', error);
    }
  }

  /**
   * Route WebSocket message to Event Bus
   */
  private routeMessage(message: any): void {
    const { type, data } = message;

    if (!type) {
      console.warn('[WebSocket] Message missing type field');
      return;
    }

    // Map WebSocket events to Event Bus events
    switch (type as WebSocketEventKey) {
      case 'investigation_progress':
        this.eventBus.emit('investigation:updated', {
          investigationId: data.investigationId,
          updates: { riskScore: data.progress }
        });
        break;

      case 'investigation_completed':
        this.eventBus.emit('investigation:completed', data);
        break;

      case 'agent_log':
        this.eventBus.emit('agent:log', data);
        break;

      case 'agent_status':
        // Handle agent status update
        break;

      case 'rag_query_result':
        // Handle RAG query result
        break;

      case 'rag_insight':
        this.eventBus.emit('rag:insight:generated', {
          sessionId: data.sessionId,
          insight: data.insight
        });
        break;

      case 'system_status':
        // Handle system status
        break;

      case 'error':
        this.eventBus.emit('ui:notification', {
          notification: {
            id: `ws-error-${Date.now()}`,
            type: 'error',
            title: 'Error',
            message: data.message || 'An error occurred',
            duration: 5000
          }
        });
        break;

      default:
        if (this.config.debug) {
          console.log(`[WebSocket] Unhandled message type: ${type}`);
        }
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.clearHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.state === 'connected') {
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      this.eventBus.emit('ui:notification', {
        notification: {
          id: `ws-reconnect-failed-${Date.now()}`,
          type: 'error',
          title: 'Connection Lost',
          message: 'Unable to reconnect to server',
          duration: 0
        }
      });
      return;
    }

    this.state = 'reconnecting';
    this.reconnectAttempts++;

    if (this.config.debug) {
      console.log(`[WebSocket] Reconnecting (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(): void {
    this.clearTimers();
    this.state = 'disconnected';

    if (this.config.reconnectEnabled) {
      this.attemptReconnect();
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

/**
 * Global WebSocket manager instance
 */
let globalWebSocketManager: WebSocketManager | null = null;

/**
 * Get or create global WebSocket manager
 */
export function getWebSocketManager(config?: WebSocketConfig): WebSocketManager {
  if (!globalWebSocketManager && config) {
    globalWebSocketManager = new WebSocketManager(config);
  }

  if (!globalWebSocketManager) {
    throw new Error('WebSocket manager not initialized. Provide config on first call.');
  }

  return globalWebSocketManager;
}

/**
 * Reset WebSocket manager (for testing)
 */
export function resetWebSocketManager(): void {
  if (globalWebSocketManager) {
    globalWebSocketManager.disconnect();
  }
  globalWebSocketManager = null;
}
