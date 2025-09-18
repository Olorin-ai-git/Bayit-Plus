/**
 * WebSocket Manager for Real-time Communication
 * Handles WebSocket connections across all 8 microservices
 * Provides type-safe event handling and automatic reconnection
 */

import { EventBusManager } from '../events/eventBus';
import type {
  WebSocketEvent,
  WebSocketMessage,
  WebSocketConnectionState,
  WebSocketSubscription,
  WebSocketConfig,
  ServiceName
} from '../types';

interface WebSocketStats {
  connectionState: WebSocketConnectionState;
  connectionAttempts: number;
  queuedMessages: number;
  subscriptions: number;
  uptime: number;
  lastPing: Date | null;
  latency: number;
}

interface QueuedMessage {
  id: string;
  message: WebSocketMessage;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private socket: WebSocket | null = null;
  private eventBus: EventBusManager;
  private config: WebSocketConfig;
  private connectionState: WebSocketConnectionState = 'disconnected';
  private subscriptions: Map<string, WebSocketSubscription> = new Map();
  private messageQueue: QueuedMessage[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private connectionStartTime: Date | null = null;
  private lastPingTime: Date | null = null;
  private latency = 0;

  private constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url || 'ws://localhost:8090/ws',
      protocols: config.protocols || [],
      reconnectEnabled: config.reconnectEnabled ?? true,
      heartbeatInterval: config.heartbeatInterval || 30000,
      messageQueueSize: config.messageQueueSize || 100,
      debug: config.debug ?? false,
      ...config
    };

    this.eventBus = EventBusManager.getInstance();
    this.setupEventListeners();
  }

  /**
   * Get singleton instance of WebSocketManager
   */
  public static getInstance(config?: WebSocketConfig): WebSocketManager {
    if (!WebSocketManager.instance) {
      if (!config) {
        throw new Error('WebSocketManager config required for first initialization');
      }
      WebSocketManager.instance = new WebSocketManager(config);
    }
    return WebSocketManager.instance;
  }

  /**
   * Initialize WebSocket connection
   */
  public async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      if (this.config.debug) {
        console.log('WebSocket already connected or connecting');
      }
      return;
    }

    this.connectionState = 'connecting';
    this.connectionStartTime = new Date();

    try {
      this.socket = new WebSocket(this.config.url, this.config.protocols);
      this.setupSocketListeners();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        this.socket!.onopen = () => {
          clearTimeout(timeout);
          this.onConnected();
          resolve();
        };

        this.socket!.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });
    } catch (error) {
      this.connectionState = 'disconnected';
      throw error;
    }
  }

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.connectionState = 'disconnected';
    this.connectionStartTime = null;

    this.eventBus.emit('websocket:disconnected', {
      reason: 'manual_disconnect',
      timestamp: new Date()
    });
  }

  /**
   * Send message to WebSocket server
   */
  public send(message: WebSocketMessage): void {
    if (this.connectionState !== 'connected') {
      this.queueMessage(message);
      return;
    }

    try {
      const messageString = JSON.stringify({
        ...message,
        id: message.id || this.generateMessageId(),
        timestamp: new Date().toISOString()
      });

      this.socket!.send(messageString);

      if (this.config.debug) {
        console.log('WebSocket message sent:', message);
      }
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.queueMessage(message);
    }
  }

  /**
   * Send message to specific service
   */
  public sendToService(service: ServiceName, message: Omit<WebSocketMessage, 'target'>): void {
    this.send({
      ...message,
      target: service
    });
  }

  /**
   * Broadcast message to all connected services
   */
  public broadcast(message: Omit<WebSocketMessage, 'target'>): void {
    this.send({
      ...message,
      target: 'broadcast'
    });
  }

  /**
   * Subscribe to WebSocket events
   */
  public subscribe<T = any>(
    eventType: string,
    handler: (data: T) => void,
    options: { service?: ServiceName; once?: boolean } = {}
  ): () => void {
    const subscriptionId = this.generateSubscriptionId();
    const subscription: WebSocketSubscription = {
      id: subscriptionId,
      eventType,
      handler,
      service: options.service,
      once: options.once || false,
      createdAt: new Date()
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(subscriptionId);
    };
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): WebSocketConnectionState {
    return this.connectionState;
  }

  /**
   * Get connection statistics
   */
  public getStats(): WebSocketStats {
    const uptime = this.connectionStartTime
      ? Date.now() - this.connectionStartTime.getTime()
      : 0;

    return {
      connectionState: this.connectionState,
      connectionAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      subscriptions: this.subscriptions.size,
      uptime,
      lastPing: this.lastPingTime,
      latency: this.latency
    };
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.onopen = () => this.onConnected();
    this.socket.onclose = (event) => this.onDisconnected(event);
    this.socket.onerror = (error) => this.onError(error);
    this.socket.onmessage = (event) => this.onMessage(event);
  }

  /**
   * Handle successful connection
   */
  private onConnected(): void {
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.processMessageQueue();

    this.eventBus.emit('websocket:connected', {
      timestamp: new Date(),
      stats: this.getStats()
    });

    if (this.config.debug) {
      console.log('WebSocket connected successfully');
    }
  }

  /**
   * Handle disconnection
   */
  private onDisconnected(event: CloseEvent): void {
    this.connectionState = 'disconnected';

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.eventBus.emit('websocket:disconnected', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      timestamp: new Date()
    });

    if (this.config.debug) {
      console.log('WebSocket disconnected:', event.code, event.reason);
    }

    // Attempt reconnection if enabled
    if (this.config.reconnectEnabled && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket errors
   */
  private onError(error: Event): void {
    console.error('WebSocket error:', error);

    this.eventBus.emit('websocket:error', {
      error,
      timestamp: new Date(),
      connectionState: this.connectionState
    });
  }

  /**
   * Handle incoming messages
   */
  private onMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      // Handle pong responses
      if (data.type === 'pong') {
        this.handlePong(data);
        return;
      }

      // Process regular messages
      this.processIncomingMessage(data);

      this.eventBus.emit('websocket:message', {
        message: data,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Process incoming messages and route to subscribers
   */
  private processIncomingMessage(message: any): void {
    const eventType = message.type || message.event;
    if (!eventType) return;

    // Route to appropriate subscribers
    for (const [id, subscription] of this.subscriptions) {
      if (subscription.eventType === eventType || subscription.eventType === '*') {
        // Check service filter
        if (subscription.service && message.source !== subscription.service) {
          continue;
        }

        try {
          subscription.handler(message.data || message);

          // Remove one-time subscriptions
          if (subscription.once) {
            this.subscriptions.delete(id);
          }
        } catch (error) {
          console.error(`Error in WebSocket subscription handler for ${eventType}:`, error);
        }
      }
    }
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: WebSocketMessage): void {
    if (this.messageQueue.length >= this.config.messageQueueSize!) {
      // Remove oldest message
      this.messageQueue.shift();
    }

    const queuedMessage: QueuedMessage = {
      id: this.generateMessageId(),
      message,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.messageQueue.push(queuedMessage);

    if (this.config.debug) {
      console.log('Message queued:', message);
    }
  }

  /**
   * Process queued messages when connection is restored
   */
  private processMessageQueue(): void {
    if (this.connectionState !== 'connected') return;

    const messagesToProcess = [...this.messageQueue];
    this.messageQueue = [];

    for (const queuedMessage of messagesToProcess) {
      try {
        this.send(queuedMessage.message);
      } catch (error) {
        // Requeue with retry count
        queuedMessage.retryCount++;
        if (queuedMessage.retryCount <= queuedMessage.maxRetries) {
          this.messageQueue.push(queuedMessage);
        }
      }
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      });
    }, delay);
  }

  /**
   * Start heartbeat ping
   */
  private startHeartbeat(): void {
    if (this.pingInterval) return;

    this.pingInterval = setInterval(() => {
      if (this.connectionState === 'connected') {
        this.sendPing();
      }
    }, this.config.heartbeatInterval!);
  }

  /**
   * Send ping to server
   */
  private sendPing(): void {
    this.lastPingTime = new Date();
    this.send({
      type: 'ping',
      timestamp: this.lastPingTime.toISOString()
    });
  }

  /**
   * Handle pong response
   */
  private handlePong(data: any): void {
    if (this.lastPingTime) {
      this.latency = Date.now() - this.lastPingTime.getTime();
    }
  }

  /**
   * Setup event bus listeners for microservice integration
   */
  private setupEventListeners(): void {
    // Listen for service events and forward via WebSocket
    const serviceEvents = [
      'auto:investigation:started',
      'auto:investigation:completed',
      'manual:investigation:started',
      'manual:investigation:completed',
      'agent:execution:started',
      'agent:execution:completed',
      'rag:query:executed',
      'viz:graph:updated',
      'report:generated',
      'ui:notification:show',
      'design:tokens:updated'
    ];

    serviceEvents.forEach(eventType => {
      this.eventBus.subscribe(eventType as any, (data) => {
        this.send({
          type: 'service_event',
          event: eventType,
          data,
          source: this.extractServiceFromEvent(eventType)
        });
      }, 'websocket-forwarder');
    });
  }

  /**
   * Extract service name from event type
   */
  private extractServiceFromEvent(eventType: string): ServiceName {
    if (eventType.startsWith('auto:')) return 'autonomous-investigation';
    if (eventType.startsWith('manual:')) return 'manual-investigation';
    if (eventType.startsWith('agent:')) return 'agent-analytics';
    if (eventType.startsWith('rag:')) return 'rag-intelligence';
    if (eventType.startsWith('viz:')) return 'visualization';
    if (eventType.startsWith('report:')) return 'reporting';
    if (eventType.startsWith('ui:')) return 'core-ui';
    if (eventType.startsWith('design:')) return 'design-system';
    return 'core-ui';
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.disconnect();
    this.subscriptions.clear();
    this.messageQueue = [];
    this.eventBus.cleanup('websocket-forwarder');
  }
}

// Export convenience functions
export const createWebSocketManager = (config: WebSocketConfig): WebSocketManager => {
  return WebSocketManager.getInstance(config);
};

export const getWebSocketManager = (): WebSocketManager => {
  return WebSocketManager.getInstance();
};

// Export default configuration
export const defaultWebSocketConfig: WebSocketConfig = {
  url: process.env.REACT_APP_WS_URL || 'ws://localhost:8090/ws',
  protocols: [],
  reconnectEnabled: true,
  heartbeatInterval: 30000,
  messageQueueSize: 100,
  debug: process.env.NODE_ENV === 'development'
};