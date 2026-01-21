/**
 * WebSocket Manager for Olorin Microservices
 * Provides real-time cross-service communication and event broadcasting
 */

import { EventBusManager } from './eventBus';

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  timeout: number;
  autoConnect: boolean;
}

export interface WebSocketMessage {
  id: string;
  type: string;
  service: string;
  target?: string;
  payload: any;
  timestamp: Date;
  correlationId?: string;
}

export interface WebSocketEvent {
  type: 'connection' | 'disconnection' | 'message' | 'error' | 'heartbeat';
  data?: any;
  timestamp: Date;
}

export interface ServiceSubscription {
  service: string;
  events: string[];
  handler: (message: WebSocketMessage) => void;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * WebSocket Manager for real-time communication
 */
export class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private config: WebSocketConfig;
  private eventBus: EventBusManager;
  private connectionState: ConnectionState = 'disconnected';
  private subscriptions: Map<string, ServiceSubscription> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
  private connectionAttempts = 0;

  private constructor(config: WebSocketConfig) {
    this.config = config;
    this.eventBus = EventBusManager.getInstance();

    if (config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Get singleton instance
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
   * Connect to WebSocket server
   */
  public async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.setConnectionState('connecting');

    try {
      this.socket = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventHandlers();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, this.config.timeout);

        this.socket!.onopen = () => {
          clearTimeout(timeout);
          this.onOpen();
          resolve();
        };

        this.socket!.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });
    } catch (error) {
      this.setConnectionState('error');
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
    }
    this.cleanup();
  }

  /**
   * Send message to WebSocket server
   */
  public send(message: Omit<WebSocketMessage, 'id' | 'timestamp'>): void {
    const fullMessage: WebSocketMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      ...message
    };

    if (this.connectionState === 'connected' && this.socket) {
      try {
        this.socket.send(JSON.stringify(fullMessage));
        console.log(`📤 WebSocket message sent:`, fullMessage);
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.queueMessage(fullMessage);
      }
    } else {
      this.queueMessage(fullMessage);
    }
  }

  /**
   * Subscribe to service events
   */
  public subscribe(service: string, events: string[], handler: (message: WebSocketMessage) => void): () => void {
    const subscriptionId = `${service}-${Date.now()}`;

    this.subscriptions.set(subscriptionId, {
      service,
      events,
      handler
    });

    // Send subscription message to server
    this.send({
      type: 'subscribe',
      service: 'shell',
      target: service,
      payload: { events }
    });

    console.log(`📋 Subscribed to ${service} events:`, events);

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(subscriptionId);
      this.send({
        type: 'unsubscribe',
        service: 'shell',
        target: service,
        payload: { events }
      });
    };
  }

  /**
   * Broadcast message to all services
   */
  public broadcast(type: string, payload: any): void {
    this.send({
      type: 'broadcast',
      service: 'shell',
      payload: { eventType: type, data: payload }
    });
  }

  /**
   * Send message to specific service
   */
  public sendToService(targetService: string, type: string, payload: any): void {
    this.send({
      type: 'service-message',
      service: 'shell',
      target: targetService,
      payload: { eventType: type, data: payload }
    });
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    connectionState: ConnectionState;
    connectionAttempts: number;
    queuedMessages: number;
    subscriptions: number;
    uptime: number;
  } {
    return {
      connectionState: this.connectionState,
      connectionAttempts: this.connectionAttempts,
      queuedMessages: this.messageQueue.length,
      subscriptions: this.subscriptions.size,
      uptime: this.socket ? Date.now() - this.connectionAttempts : 0
    };
  }

  /**
   * Private: Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = this.onOpen.bind(this);
    this.socket.onclose = this.onClose.bind(this);
    this.socket.onerror = this.onError.bind(this);
    this.socket.onmessage = this.onMessage.bind(this);
  }

  /**
   * Private: Handle WebSocket open event
   */
  private onOpen(): void {
    console.log('🔗 WebSocket connected to:', this.config.url);
    this.setConnectionState('connected');
    this.connectionAttempts = 0;
    this.clearReconnectTimeout();
    this.startHeartbeat();
    this.processMessageQueue();

    // Emit connection event
    this.eventBus.emit('websocket:connected', {
      connectionId: this.generateMessageId()
    });
  }

  /**
   * Private: Handle WebSocket close event
   */
  private onClose(event: CloseEvent): void {
    console.log('🔌 WebSocket disconnected:', event.code, event.reason);
    this.setConnectionState('disconnected');
    this.stopHeartbeat();

    // Emit disconnection event
    this.eventBus.emit('websocket:disconnected', {
      connectionId: this.generateMessageId()
    });

    // Attempt reconnection if not intentional close
    if (event.code !== 1000 && this.connectionAttempts < this.config.reconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Private: Handle WebSocket error event
   */
  private onError(error: Event): void {
    console.error('❌ WebSocket error:', error);
    this.setConnectionState('error');

    // Emit error event
    this.eventBus.emit('service:error', {
      service: 'websocket-manager',
      error: new Error('WebSocket connection error')
    });
  }

  /**
   * Private: Handle incoming WebSocket messages
   */
  private onMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('📥 WebSocket message received:', message);

      // Route message to appropriate handlers
      this.routeMessage(message);

      // Emit generic message event
      this.eventBus.emit('websocket:message', {
        type: message.type,
        data: message.payload
      });
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Private: Route message to subscribed handlers
   */
  private routeMessage(message: WebSocketMessage): void {
    this.subscriptions.forEach((subscription) => {
      if (
        subscription.service === message.service &&
        subscription.events.includes(message.type)
      ) {
        try {
          subscription.handler(message);
        } catch (error) {
          console.error(`Error in subscription handler for ${subscription.service}:`, error);
        }
      }
    });

    // Route to event bus based on message type
    this.routeToEventBus(message);
  }

  /**
   * Private: Route messages to event bus
   */
  private routeToEventBus(message: WebSocketMessage): void {
    const { type, service, payload } = message;

    // Map WebSocket messages to event bus events
    switch (type) {
      case 'investigation-started':
        if (service === 'autonomous-investigation') {
          this.eventBus.emit('auto:investigation:started', payload);
        } else if (service === 'manual-investigation') {
          this.eventBus.emit('manual:investigation:started', payload);
        }
        break;

      case 'investigation-completed':
        if (service === 'autonomous-investigation') {
          this.eventBus.emit('auto:investigation:completed', payload);
        } else if (service === 'manual-investigation') {
          this.eventBus.emit('manual:investigation:completed', payload);
        }
        break;

      case 'agent-execution':
        this.eventBus.emit('agent:execution:started', payload);
        break;

      case 'visualization-updated':
        this.eventBus.emit('viz:graph:updated', payload);
        break;

      case 'report-generated':
        this.eventBus.emit('report:generated', payload);
        break;

      case 'service-health':
        this.eventBus.emit('service:health:check', payload);
        break;

      default:
        console.log(`Unhandled WebSocket message type: ${type}`);
    }
  }

  /**
   * Private: Set connection state and emit events
   */
  private setConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState;
    this.connectionState = state;

    if (previousState !== state) {
      console.log(`🔄 WebSocket state changed: ${previousState} → ${state}`);
    }
  }

  /**
   * Private: Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.setConnectionState('reconnecting');
    this.connectionAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.connectionAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.connectionAttempts}/${this.config.reconnectAttempts})`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);

        if (this.connectionAttempts < this.config.reconnectAttempts) {
          this.scheduleReconnect();
        } else {
          console.error('Max reconnection attempts reached');
          this.setConnectionState('error');
        }
      });
    }, delay);
  }

  /**
   * Private: Clear reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Private: Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
    }

    this.heartbeatIntervalId = setInterval(() => {
      if (this.connectionState === 'connected') {
        this.send({
          type: 'heartbeat',
          service: 'shell',
          payload: { timestamp: Date.now() }
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Private: Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  /**
   * Private: Queue message for later sending
   */
  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);
    console.log(`📋 Message queued (queue size: ${this.messageQueue.length})`);
  }

  /**
   * Private: Process queued messages
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Processing ${this.messageQueue.length} queued messages`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach((message) => {
      this.send(message);
    });
  }

  /**
   * Private: Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private: Cleanup resources
   */
  private cleanup(): void {
    this.setConnectionState('disconnected');
    this.clearReconnectTimeout();
    this.stopHeartbeat();
    this.socket = null;
  }
}

/**
 * Default WebSocket configuration for Olorin
 */
export const defaultWebSocketConfig: WebSocketConfig = {
  url: 'ws://localhost:8090/ws',
  reconnectAttempts: 5,
  reconnectInterval: 1000,
  heartbeatInterval: 30000,
  timeout: 10000,
  autoConnect: true
};

/**
 * Service-specific WebSocket helpers
 */
export const WebSocketServiceHelpers = {
  /**
   * Create investigation service subscription
   */
  subscribeToInvestigations(handler: (message: WebSocketMessage) => void): () => void {
    const wsManager = WebSocketManager.getInstance();
    return wsManager.subscribe('investigation', [
      'investigation-started',
      'investigation-completed',
      'investigation-updated',
      'investigation-escalated'
    ], handler);
  },

  /**
   * Create analytics service subscription
   */
  subscribeToAnalytics(handler: (message: WebSocketMessage) => void): () => void {
    const wsManager = WebSocketManager.getInstance();
    return wsManager.subscribe('agent-analytics', [
      'agent-execution',
      'performance-updated',
      'anomaly-detected'
    ], handler);
  },

  /**
   * Create visualization service subscription
   */
  subscribeToVisualization(handler: (message: WebSocketMessage) => void): () => void {
    const wsManager = WebSocketManager.getInstance();
    return wsManager.subscribe('visualization', [
      'visualization-updated',
      'chart-data-updated',
      'map-location-added'
    ], handler);
  },

  /**
   * Create reporting service subscription
   */
  subscribeToReporting(handler: (message: WebSocketMessage) => void): () => void {
    const wsManager = WebSocketManager.getInstance();
    return wsManager.subscribe('reporting', [
      'report-generated',
      'export-started',
      'export-completed'
    ], handler);
  },

  /**
   * Broadcast investigation event to all services
   */
  broadcastInvestigationEvent(type: string, data: any): void {
    const wsManager = WebSocketManager.getInstance();
    wsManager.broadcast(`investigation:${type}`, data);
  },

  /**
   * Send service health update
   */
  sendServiceHealth(service: string, health: any): void {
    const wsManager = WebSocketManager.getInstance();
    wsManager.sendToService('core-ui', 'service-health', { service, health });
  }
};

/**
 * Factory function to create and configure WebSocket manager
 */
export function createWebSocketManager(config?: Partial<WebSocketConfig>): WebSocketManager {
  const fullConfig = { ...defaultWebSocketConfig, ...config };
  return WebSocketManager.getInstance(fullConfig);
}

export default WebSocketManager;