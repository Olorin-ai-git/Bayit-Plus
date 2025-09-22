import { ServiceConfig, WebSocketMessage, ServiceEvent } from '../types';

export type EventHandler<T = any> = (event: WebSocketMessage<T>) => void;
export type EventFilter = (event: WebSocketMessage) => boolean;

interface Subscription {
  id: string;
  event: string;
  handler: EventHandler;
  filter?: EventFilter;
  investigation_id?: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: ServiceConfig;
  private subscriptions: Map<string, Subscription> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private isDestroyed = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastPongTime = 0;

  constructor(config: ServiceConfig) {
    this.config = config;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('WebSocketService has been destroyed');
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.establishConnection();
    return this.connectionPromise;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isDestroyed = true;
    this.clearHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionPromise = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribe to specific events
   */
  subscribe<T = any>(
    event: string,
    handler: EventHandler<T>,
    options: {
      filter?: EventFilter;
      investigation_id?: string;
    } = {}
  ): string {
    const id = this.generateSubscriptionId();
    const subscription: Subscription = {
      id,
      event,
      handler: handler as EventHandler,
      filter: options.filter,
      investigation_id: options.investigation_id,
    };

    this.subscriptions.set(id, subscription);

    // Send subscription message to server if connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscriptionMessage('subscribe', subscription);
    }

    return id;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Send unsubscription message to server if connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscriptionMessage('unsubscribe', subscription);
    }

    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Subscribe to investigation-specific events
   */
  subscribeToInvestigation<T = any>(
    investigationId: string,
    handler: EventHandler<T>
  ): string {
    return this.subscribe(
      'investigation.*',
      handler,
      {
        investigation_id: investigationId,
        filter: (event) => event.investigation_id === investigationId
      }
    );
  }

  /**
   * Subscribe to step events for an investigation
   */
  subscribeToSteps<T = any>(
    investigationId: string,
    handler: EventHandler<T>
  ): string {
    return this.subscribe(
      'step.*',
      handler,
      {
        investigation_id: investigationId,
        filter: (event) => event.investigation_id === investigationId
      }
    );
  }

  /**
   * Subscribe to collaboration events for an investigation
   */
  subscribeToCollaboration<T = any>(
    investigationId: string,
    handler: EventHandler<T>
  ): string {
    return this.subscribe(
      'collaboration.*',
      handler,
      {
        investigation_id: investigationId,
        filter: (event) => event.investigation_id === investigationId
      }
    );
  }

  /**
   * Send a message to the server
   */
  async send(message: any): Promise<void> {
    await this.connect();

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (this.isConnecting) return 'connecting';
    if (!this.ws) return 'disconnected';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Establish WebSocket connection
   */
  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;
        const url = this.buildWebSocketUrl();
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionPromise = null;
          this.startHeartbeat();
          this.resubscribeAll();

          if (this.config.debug_mode) {
            console.log('WebSocket connected');
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          this.isConnecting = false;
          this.clearHeartbeat();

          if (this.config.debug_mode) {
            console.log('WebSocket closed:', event.code, event.reason);
          }

          if (!this.isDestroyed && event.code !== 1000) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.isConnecting = false;

          if (this.config.debug_mode) {
            console.error('WebSocket error:', error);
          }

          if (this.connectionPromise) {
            reject(new Error('WebSocket connection failed'));
          }
        };

        // Set connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            this.ws?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, this.config.timeout_ms);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle pong messages for heartbeat
      if (message.type === 'pong') {
        this.lastPongTime = Date.now();
        return;
      }

      // Distribute message to relevant subscriptions
      this.subscriptions.forEach((subscription) => {
        if (this.shouldDeliverMessage(message, subscription)) {
          try {
            subscription.handler(message);
          } catch (error) {
            if (this.config.debug_mode) {
              console.error('Error in subscription handler:', error);
            }
          }
        }
      });

    } catch (error) {
      if (this.config.debug_mode) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }

  /**
   * Check if message should be delivered to subscription
   */
  private shouldDeliverMessage(message: WebSocketMessage, subscription: Subscription): boolean {
    // Check event pattern match
    const eventMatches = this.matchesEventPattern(message.event, subscription.event);
    if (!eventMatches) return false;

    // Apply custom filter if provided
    if (subscription.filter && !subscription.filter(message)) {
      return false;
    }

    // Check investigation_id filter
    if (subscription.investigation_id && message.investigation_id !== subscription.investigation_id) {
      return false;
    }

    return true;
  }

  /**
   * Check if event matches subscription pattern
   */
  private matchesEventPattern(event: string, pattern: string): boolean {
    // Convert pattern to regex (support wildcards)
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(event);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.config.debug_mode) {
        console.error('Max reconnection attempts reached');
      }
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    if (this.config.debug_mode) {
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    }

    setTimeout(() => {
      if (!this.isDestroyed) {
        this.connect().catch(() => {
          // Reconnection failed, will be retried automatically
        });
      }
    }, delay);
  }

  /**
   * Resubscribe to all active subscriptions after reconnection
   */
  private resubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      this.sendSubscriptionMessage('subscribe', subscription);
    });
  }

  /**
   * Send subscription/unsubscription message to server
   */
  private sendSubscriptionMessage(action: 'subscribe' | 'unsubscribe', subscription: Subscription): void {
    const message = {
      type: action,
      event: subscription.event,
      investigation_id: subscription.investigation_id,
      subscription_id: subscription.id,
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.lastPongTime = Date.now();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send ping
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

        // Check if we received pong recently
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > 30000) { // 30 seconds timeout
          if (this.config.debug_mode) {
            console.warn('WebSocket heartbeat timeout, closing connection');
          }
          this.ws.close();
        }
      }
    }, 15000); // Send ping every 15 seconds
  }

  /**
   * Clear heartbeat interval
   */
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Build WebSocket URL with authentication
   */
  private buildWebSocketUrl(): string {
    const url = new URL(this.config.websocket_url);

    // Add authentication token if available
    const token = this.getAuthToken();
    if (token) {
      url.searchParams.set('token', token);
    }

    return url.toString();
  }

  /**
   * Get authentication token from storage
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    return localStorage.getItem('auth_token') ||
           sessionStorage.getItem('auth_token');
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}