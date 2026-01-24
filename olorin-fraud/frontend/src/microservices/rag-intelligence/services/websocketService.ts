import { RAGEvent } from '../types/ragIntelligence';

// WebSocket connection states
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

// WebSocket event types
export interface WebSocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: RAGEvent) => void;
  onReconnect?: (attempt: number) => void;
  onStateChange?: (state: WebSocketState) => void;
}

// WebSocket configuration
export interface WebSocketConfig {
  url?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  subscriptions?: string[];
}

// Default configuration - CRITICAL: No fallback allowed for security
const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  url: process.env.REACT_APP_RAG_WS_URL || (() => {
    throw new Error('CRITICAL: REACT_APP_RAG_WS_URL is not set. Set it in your .env file. No fallback allowed for security.');
  })(),
  reconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  subscriptions: []
};

// RAG WebSocket Service
export class RAGWebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private handlers: WebSocketEventHandlers = {};
  private state: WebSocketState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isIntentionalDisconnect = false;

  constructor(config: WebSocketConfig = {}, handlers: WebSocketEventHandlers = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.handlers = handlers;
  }

  // Update handlers
  setHandlers(handlers: WebSocketEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  // Get current state
  getState(): WebSocketState {
    return this.state;
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Connect to WebSocket
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected()) {
        resolve();
        return;
      }

      this.setState('connecting');
      this.isIntentionalDisconnect = false;

      try {
        const token = localStorage.getItem('authToken');
        const url = new URL(this.config.url);
        if (token) {
          url.searchParams.set('token', token);
        }

        this.ws = new WebSocket(url.toString());

        // Connection opened
        this.ws.onopen = () => {
          console.log('RAG WebSocket connected');
          this.setState('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.subscribeToEvents();
          this.handlers.onConnect?.();
          resolve();
        };

        // Message received
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Handle different message types
            switch (data.type) {
              case 'event':
                this.handlers.onMessage?.(data.payload as RAGEvent);
                break;
              case 'heartbeat':
                // Respond to heartbeat
                this.send({ type: 'heartbeat_ack' });
                break;
              case 'subscription_confirmed':
                console.log('Subscription confirmed:', data.channel);
                break;
              case 'error':
                console.error('WebSocket error message:', data.message);
                break;
              default:
                console.log('Unknown message type:', data.type);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        // Connection closed
        this.ws.onclose = (event) => {
          console.log('RAG WebSocket disconnected:', event.code, event.reason);
          this.setState('disconnected');
          this.stopHeartbeat();
          this.handlers.onDisconnect?.();

          // Attempt reconnection if not intentional
          if (!this.isIntentionalDisconnect && this.config.reconnect) {
            this.scheduleReconnect();
          }
        };

        // Connection error
        this.ws.onerror = (error) => {
          console.error('RAG WebSocket error:', error);
          this.setState('error');
          this.handlers.onError?.(error);
          reject(new Error('WebSocket connection failed'));
        };

      } catch (error) {
        this.setState('error');
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket
  disconnect(): void {
    this.isIntentionalDisconnect = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setState('disconnected');
  }

  // Send message
  send(message: any): boolean {
    if (!this.isConnected()) {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }

    try {
      this.ws!.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  // Subscribe to specific event types
  subscribe(eventTypes: string[]): void {
    this.config.subscriptions = [...new Set([...this.config.subscriptions, ...eventTypes])];

    if (this.isConnected()) {
      this.send({
        type: 'subscribe',
        channels: eventTypes
      });
    }
  }

  // Unsubscribe from event types
  unsubscribe(eventTypes: string[]): void {
    this.config.subscriptions = this.config.subscriptions.filter(
      sub => !eventTypes.includes(sub)
    );

    if (this.isConnected()) {
      this.send({
        type: 'unsubscribe',
        channels: eventTypes
      });
    }
  }

  // Subscribe to user-specific events
  subscribeToUser(userId: string): void {
    this.subscribe([`user:${userId}`]);
  }

  // Subscribe to knowledge base events
  subscribeToKnowledgeBase(knowledgeBaseId: string): void {
    this.subscribe([`kb:${knowledgeBaseId}`]);
  }

  // Subscribe to session events
  subscribeToSession(sessionId: string): void {
    this.subscribe([`session:${sessionId}`]);
  }

  // Private methods
  private setState(newState: WebSocketState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.handlers.onStateChange?.(newState);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
      this.handlers.onReconnect?.(this.reconnectAttempts);
      this.connect().catch(() => {
        // Reconnection failed, will try again
      });
    }, this.config.reconnectInterval);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'heartbeat' });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private subscribeToEvents(): void {
    if (this.config.subscriptions.length > 0) {
      this.send({
        type: 'subscribe',
        channels: this.config.subscriptions
      });
    }
  }

  // Cleanup
  destroy(): void {
    this.disconnect();
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.handlers = {};
  }
}

// Event manager for handling multiple event streams
export class RAGEventManager {
  private services = new Map<string, RAGWebSocketService>();
  private globalHandlers: WebSocketEventHandlers = {};

  // Set global event handlers
  setGlobalHandlers(handlers: WebSocketEventHandlers): void {
    this.globalHandlers = handlers;
  }

  // Create a new WebSocket service
  createService(
    id: string,
    config: WebSocketConfig = {},
    handlers: WebSocketEventHandlers = {}
  ): RAGWebSocketService {
    // Merge global and specific handlers
    const mergedHandlers: WebSocketEventHandlers = {
      onConnect: () => {
        this.globalHandlers.onConnect?.();
        handlers.onConnect?.();
      },
      onDisconnect: () => {
        this.globalHandlers.onDisconnect?.();
        handlers.onDisconnect?.();
      },
      onError: (error) => {
        this.globalHandlers.onError?.(error);
        handlers.onError?.(error);
      },
      onMessage: (event) => {
        this.globalHandlers.onMessage?.(event);
        handlers.onMessage?.(event);
      },
      onReconnect: (attempt) => {
        this.globalHandlers.onReconnect?.(attempt);
        handlers.onReconnect?.(attempt);
      },
      onStateChange: (state) => {
        this.globalHandlers.onStateChange?.(state);
        handlers.onStateChange?.(state);
      }
    };

    const service = new RAGWebSocketService(config, mergedHandlers);
    this.services.set(id, service);
    return service;
  }

  // Get existing service
  getService(id: string): RAGWebSocketService | undefined {
    return this.services.get(id);
  }

  // Remove service
  removeService(id: string): void {
    const service = this.services.get(id);
    if (service) {
      service.destroy();
      this.services.delete(id);
    }
  }

  // Connect all services
  async connectAll(): Promise<void> {
    const promises = Array.from(this.services.values()).map(service =>
      service.connect().catch(error => {
        console.error('Failed to connect service:', error);
      })
    );
    await Promise.allSettled(promises);
  }

  // Disconnect all services
  disconnectAll(): void {
    this.services.forEach(service => service.disconnect());
  }

  // Get connection status
  getConnectionStatus(): Record<string, WebSocketState> {
    const status: Record<string, WebSocketState> = {};
    this.services.forEach((service, id) => {
      status[id] = service.getState();
    });
    return status;
  }

  // Broadcast message to all connected services
  broadcast(message: any): void {
    this.services.forEach(service => {
      if (service.isConnected()) {
        service.send(message);
      }
    });
  }

  // Cleanup all services
  destroy(): void {
    this.services.forEach(service => service.destroy());
    this.services.clear();
    this.globalHandlers = {};
  }
}

// Utility functions
export const createRAGWebSocketService = (
  config?: WebSocketConfig,
  handlers?: WebSocketEventHandlers
): RAGWebSocketService => {
  return new RAGWebSocketService(config, handlers);
};

// Export singleton event manager
export const ragEventManager = new RAGEventManager();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    ragEventManager.destroy();
  });
}

// Export types
export type { WebSocketEventHandlers, WebSocketConfig };