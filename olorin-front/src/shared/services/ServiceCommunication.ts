export interface ServiceMessage {
  id: string;
  type: string;
  source: string;
  target: string;
  data: any;
  timestamp: string;
  requestId?: string;
  correlationId?: string;
}

export interface ServiceResponse {
  id: string;
  requestId: string;
  source: string;
  target: string;
  data: any;
  error?: string;
  timestamp: string;
  success: boolean;
}

export class ServiceCommunication {
  private eventBus: any;
  private serviceName: string;
  private pendingRequests: Map<string, {
    resolve: (data: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(serviceName: string, eventBus: any) {
    this.serviceName = serviceName;
    this.eventBus = eventBus;

    // Listen for messages directed to this service
    this.eventBus.on(`message:${serviceName}`, this.handleIncomingMessage.bind(this));
    this.eventBus.on(`response:${serviceName}`, this.handleIncomingResponse.bind(this));

    console.log(`[ServiceCommunication] Initialized for service: ${serviceName}`);
  }

  /**
   * Send a message to another service
   */
  async sendMessage(target: string, type: string, data: any, timeout: number = 5000): Promise<any> {
    const requestId = this.generateRequestId();
    const message: ServiceMessage = {
      id: this.generateMessageId(),
      type,
      source: this.serviceName,
      target,
      data,
      timestamp: new Date().toISOString(),
      requestId
    };

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${target}/${type}`));
      }, timeout);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutId
      });

      // Send message via event bus
      this.eventBus.emit(`message:${target}`, message, this.serviceName);

      console.log(`[ServiceCommunication] Message sent to ${target}:`, { type, requestId });
    });
  }

  /**
   * Send a fire-and-forget message
   */
  sendNotification(target: string, type: string, data: any): void {
    const message: ServiceMessage = {
      id: this.generateMessageId(),
      type,
      source: this.serviceName,
      target,
      data,
      timestamp: new Date().toISOString()
    };

    this.eventBus.emit(`message:${target}`, message, this.serviceName);
    console.log(`[ServiceCommunication] Notification sent to ${target}:`, { type });
  }

  /**
   * Broadcast a message to all services
   */
  broadcast(type: string, data: any): void {
    const message: ServiceMessage = {
      id: this.generateMessageId(),
      type,
      source: this.serviceName,
      target: 'broadcast',
      data,
      timestamp: new Date().toISOString()
    };

    this.eventBus.emit('message:broadcast', message, this.serviceName);
    console.log(`[ServiceCommunication] Broadcast sent:`, { type });
  }

  /**
   * Register a message handler
   */
  onMessage(type: string, handler: (data: any, source: string, requestId?: string) => any | Promise<any>): void {
    this.eventBus.on(`message:${this.serviceName}:${type}`, async (messageData: any) => {
      try {
        const result = await handler(messageData.data, messageData.source, messageData.requestId);

        // Send response if this was a request
        if (messageData.requestId) {
          this.sendResponse(messageData.source, messageData.requestId, result);
        }
      } catch (error) {
        console.error(`[ServiceCommunication] Error handling message ${type}:`, error);

        // Send error response if this was a request
        if (messageData.requestId) {
          this.sendErrorResponse(messageData.source, messageData.requestId, error);
        }
      }
    });

    console.log(`[ServiceCommunication] Handler registered for message type: ${type}`);
  }

  /**
   * Handle incoming messages
   */
  private handleIncomingMessage(message: ServiceMessage): void {
    console.log(`[ServiceCommunication] Received message:`, {
      type: message.type,
      source: message.source,
      requestId: message.requestId
    });

    // Emit specific message type event
    this.eventBus.emit(`message:${this.serviceName}:${message.type}`, message, message.source);
  }

  /**
   * Handle incoming responses
   */
  private handleIncomingResponse(response: ServiceResponse): void {
    console.log(`[ServiceCommunication] Received response:`, {
      requestId: response.requestId,
      source: response.source,
      success: response.success
    });

    const pendingRequest = this.pendingRequests.get(response.requestId);
    if (pendingRequest) {
      clearTimeout(pendingRequest.timeout);
      this.pendingRequests.delete(response.requestId);

      if (response.success) {
        pendingRequest.resolve(response.data);
      } else {
        pendingRequest.reject(new Error(response.error || 'Unknown error'));
      }
    }
  }

  /**
   * Send a successful response
   */
  private sendResponse(target: string, requestId: string, data: any): void {
    const response: ServiceResponse = {
      id: this.generateMessageId(),
      requestId,
      source: this.serviceName,
      target,
      data,
      timestamp: new Date().toISOString(),
      success: true
    };

    this.eventBus.emit(`response:${target}`, response, this.serviceName);
  }

  /**
   * Send an error response
   */
  private sendErrorResponse(target: string, requestId: string, error: any): void {
    const response: ServiceResponse = {
      id: this.generateMessageId(),
      requestId,
      source: this.serviceName,
      target,
      data: null,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      success: false
    };

    this.eventBus.emit(`response:${target}`, response, this.serviceName);
  }

  /**
   * Get pending requests count
   */
  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Clear all pending requests
   */
  clearPendingRequests(): void {
    this.pendingRequests.forEach(request => {
      clearTimeout(request.timeout);
      request.reject(new Error('Service communication cleared'));
    });
    this.pendingRequests.clear();
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}