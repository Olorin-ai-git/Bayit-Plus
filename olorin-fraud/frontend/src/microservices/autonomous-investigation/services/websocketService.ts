/**
 * WebSocket Service
 * Manages WebSocket connections for real-time investigation updates
 */

import { io, Socket } from 'socket.io-client';
import { Investigation, InvestigationPhase, Evidence, Domain } from '../types';

// WebSocket event types
interface WebSocketEvents {
  // Investigation events
  'investigation:created': Investigation;
  'investigation:updated': Investigation;
  'investigation:phase_changed': {
    investigation_id: string;
    phase: InvestigationPhase;
    timestamp: string;
  };
  'investigation:status_changed': {
    investigation_id: string;
    status: string;
    timestamp: string;
  };

  // Evidence events
  'evidence:added': {
    investigation_id: string;
    evidence: Evidence;
    timestamp: string;
  };
  'evidence:updated': {
    investigation_id: string;
    evidence: Evidence;
    timestamp: string;
  };

  // Domain events
  'domain:analysis_complete': {
    investigation_id: string;
    domain: Domain;
    timestamp: string;
  };
  'domain:risk_updated': {
    investigation_id: string;
    domain_name: string;
    risk_score: number;
    timestamp: string;
  };

  // Progress events
  'progress:update': {
    investigation_id: string;
    phase: InvestigationPhase;
    progress: number;
    message: string;
    timestamp: string;
  };

  // Error events
  'error:investigation': {
    investigation_id: string;
    error: string;
    details?: unknown;
    timestamp: string;
  };

  // System events
  'system:maintenance': {
    message: string;
    start_time: string;
    estimated_duration: number;
  };
}

type EventName = keyof WebSocketEvents;
type EventHandler<T extends EventName> = (data: WebSocketEvents[T]) => void;

interface WebSocketServiceConfig {
  url: string;
  autoConnect: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  debug: boolean;
}

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  lastConnected: Date | null;
  connectionId: string | null;
  reconnectAttempts: number;
}

class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<EventName, Set<EventHandler<any>>> = new Map();
  private connectionState: ConnectionState = {
    connected: false,
    connecting: false,
    reconnecting: false,
    lastConnected: null,
    connectionId: null,
    reconnectAttempts: 0,
  };

  private config: WebSocketServiceConfig;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<WebSocketServiceConfig> = {}) {
    this.config = {
      url: process.env.REACT_APP_WS_URL || (() => {
        throw new Error('CRITICAL: REACT_APP_WS_URL is not set. Set it in your .env file. No fallback allowed for security.');
      })(),
      autoConnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 3000,
      heartbeatInterval: 30000,
      debug: process.env.NODE_ENV === 'development',
      ...config,
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.connectionState.connecting = true;
      this.log('Connecting to WebSocket server...');

      this.socket = io(this.config.url, {
        transports: ['websocket', 'polling'],
        auth: {
          token: localStorage.getItem('auth_token'),
        },
        forceNew: true,
      });

      this.setupEventListeners(resolve, reject);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.log('Disconnecting from WebSocket server...');

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState = {
      connected: false,
      connecting: false,
      reconnecting: false,
      lastConnected: null,
      connectionId: null,
      reconnectAttempts: 0,
    };
  }

  /**
   * Subscribe to investigation updates for a specific investigation
   */
  subscribeToInvestigation(investigationId: string): void {
    if (!this.socket?.connected) {
      this.log('Cannot subscribe: WebSocket not connected');
      return;
    }

    this.socket.emit('subscribe:investigation', { investigation_id: investigationId });
    this.log(`Subscribed to investigation: ${investigationId}`);
  }

  /**
   * Unsubscribe from investigation updates
   */
  unsubscribeFromInvestigation(investigationId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('unsubscribe:investigation', { investigation_id: investigationId });
    this.log(`Unsubscribed from investigation: ${investigationId}`);
  }

  /**
   * Add event listener
   */
  on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * Remove event listener
   */
  off<T extends EventName>(event: T, handler: EventHandler<T>): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState.connected;
  }

  /**
   * Force reconnection
   */
  reconnect(): void {
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  private setupEventListeners(resolve: () => void, reject: (error: Error) => void): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.connectionState = {
        connected: true,
        connecting: false,
        reconnecting: false,
        lastConnected: new Date(),
        connectionId: this.socket?.id || null,
        reconnectAttempts: 0,
      };

      this.log('WebSocket connected', this.connectionState.connectionId);
      this.startHeartbeat();
      resolve();
    });

    this.socket.on('disconnect', (reason) => {
      this.connectionState.connected = false;
      this.log('WebSocket disconnected', reason);

      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      // Attempt reconnection for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.attemptReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.connectionState.connecting = false;
      this.log('WebSocket connection error', error.message);
      reject(error);
      this.attemptReconnection();
    });

    // Investigation events
    this.socket.on('investigation:created', (data) => {
      this.emit('investigation:created', data);
    });

    this.socket.on('investigation:updated', (data) => {
      this.emit('investigation:updated', data);
    });

    this.socket.on('investigation:phase_changed', (data) => {
      this.emit('investigation:phase_changed', data);
    });

    this.socket.on('investigation:status_changed', (data) => {
      this.emit('investigation:status_changed', data);
    });

    // Evidence events
    this.socket.on('evidence:added', (data) => {
      this.emit('evidence:added', data);
    });

    this.socket.on('evidence:updated', (data) => {
      this.emit('evidence:updated', data);
    });

    // Domain events
    this.socket.on('domain:analysis_complete', (data) => {
      this.emit('domain:analysis_complete', data);
    });

    this.socket.on('domain:risk_updated', (data) => {
      this.emit('domain:risk_updated', data);
    });

    // Progress events
    this.socket.on('progress:update', (data) => {
      this.emit('progress:update', data);
    });

    // Error events
    this.socket.on('error:investigation', (data) => {
      this.emit('error:investigation', data);
    });

    // System events
    this.socket.on('system:maintenance', (data) => {
      this.emit('system:maintenance', data);
    });

    // Heartbeat response
    this.socket.on('pong', () => {
      this.log('Heartbeat response received');
    });
  }

  private emit<T extends EventName>(event: T, data: WebSocketEvents[T]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          this.log('Error in event handler', error);
        }
      });
    }
  }

  private attemptReconnection(): void {
    if (
      this.connectionState.reconnecting ||
      this.connectionState.reconnectAttempts >= this.config.reconnectAttempts
    ) {
      return;
    }

    this.connectionState.reconnecting = true;
    this.connectionState.reconnectAttempts++;

    const delay = this.config.reconnectDelay * this.connectionState.reconnectAttempts;
    this.log(`Attempting reconnection in ${delay}ms (attempt ${this.connectionState.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Reconnection failed, try again if we haven't exceeded max attempts
        this.connectionState.reconnecting = false;
        this.attemptReconnection();
      });
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        this.log('Heartbeat sent');
      }
    }, this.config.heartbeatInterval);
  }

  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[WebSocket] ${message}`, data);
    }
  }
}

// Create and export singleton instance
export const websocketService = new WebSocketService();

// Export types for use in components
export type { EventName, EventHandler, WebSocketEvents, ConnectionState };