/**
 * WebSocket Manager Integration Tests
 * Tests real-time communication and connection management across microservices
 */

import { WebSocketManager, WebSocketConfig, WebSocketMessage, ConnectionState } from '../../websocket-manager';
import { EventBusManager } from '../../eventBus';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState: number = MockWebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;

  private sentMessages: string[] = [];
  private shouldFailConnection = false;
  private connectionDelay = 0;

  constructor(public url: string, public protocols?: string[]) {
    // Simulate connection delay
    setTimeout(() => {
      if (this.shouldFailConnection) {
        this.readyState = MockWebSocket.CLOSED;
        this.onerror?.(new Event('error'));
      } else {
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.(new Event('open'));
      }
    }, this.connectionDelay);
  }

  send(data: string): void {
    if (this.readyState === MockWebSocket.OPEN) {
      this.sentMessages.push(data);
    } else {
      throw new Error('WebSocket is not open');
    }
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this.onclose?.(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
    }, 10);
  }

  // Test utilities
  simulateMessage(data: any): void {
    if (this.readyState === MockWebSocket.OPEN) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data)
      });
      this.onmessage?.(event);
    }
  }

  simulateError(): void {
    this.onerror?.(new Event('error'));
  }

  simulateClose(code: number = 1000, reason: string = ''): void {
    this.close(code, reason);
  }

  getSentMessages(): string[] {
    return [...this.sentMessages];
  }

  getLastSentMessage(): any {
    const lastMessage = this.sentMessages[this.sentMessages.length - 1];
    return lastMessage ? JSON.parse(lastMessage) : null;
  }

  static setConnectionBehavior(shouldFail: boolean, delay: number = 0): void {
    MockWebSocket.prototype.shouldFailConnection = shouldFail;
    MockWebSocket.prototype.connectionDelay = delay;
  }
}

// Set up global WebSocket mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocket Manager Integration Tests', () => {
  let wsManager: WebSocketManager;
  let eventBusManager: EventBusManager;
  let mockWebSocket: MockWebSocket;
  let config: WebSocketConfig;

  beforeEach(async () => {
    // Reset WebSocket behavior
    MockWebSocket.setConnectionBehavior(false, 10);

    // Clear singleton instances
    (WebSocketManager as any).instance = null;
    
    config = {
      url: 'ws://localhost:8090/ws',
      reconnectAttempts: 3,
      reconnectInterval: 100,
      heartbeatInterval: 1000,
      timeout: 500,
      autoConnect: false
    };

    eventBusManager = EventBusManager.getInstance();
    wsManager = WebSocketManager.getInstance(config);

    // Clear event bus
    eventBusManager.cleanup('websocket-test');
  });

  afterEach(() => {
    if (wsManager) {
      wsManager.disconnect();
    }
    eventBusManager.cleanup('websocket-test');
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection successfully', async () => {
      await wsManager.connect();
      
      expect(wsManager.getConnectionState()).toBe('connected');
      
      const stats = wsManager.getStats();
      expect(stats.connectionState).toBe('connected');
      expect(stats.connectionAttempts).toBe(0);
    });

    it('should handle connection timeout', async () => {
      MockWebSocket.setConnectionBehavior(false, 1000); // Long delay
      
      const config = {
        ...wsManager.getStats(),
        timeout: 100 // Short timeout
      };

      try {
        await wsManager.connect();
        fail('Should have thrown timeout error');
      } catch (error) {
        expect(error.message).toContain('timeout');
      }
    });

    it('should handle connection failure', async () => {
      MockWebSocket.setConnectionBehavior(true); // Force failure
      
      try {
        await wsManager.connect();
        fail('Should have thrown connection error');
      } catch (error) {
        expect(wsManager.getConnectionState()).toBe('error');
      }
    });

    it('should disconnect cleanly', async () => {
      await wsManager.connect();
      expect(wsManager.getConnectionState()).toBe('connected');
      
      wsManager.disconnect();
      
      // Wait for disconnection
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(wsManager.getConnectionState()).toBe('disconnected');
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on unexpected disconnect', async () => {
      await wsManager.connect();
      expect(wsManager.getConnectionState()).toBe('connected');

      // Get the mock WebSocket instance
      mockWebSocket = (global as any).WebSocket.prototype;
      
      // Simulate unexpected disconnect
      mockWebSocket.simulateClose(1006, 'Connection lost'); // Abnormal closure
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const stats = wsManager.getStats();
      expect(stats.connectionAttempts).toBeGreaterThan(0);
    });

    it('should not reconnect on intentional disconnect', async () => {
      await wsManager.connect();
      expect(wsManager.getConnectionState()).toBe('connected');
      
      const initialStats = wsManager.getStats();
      
      wsManager.disconnect(); // Intentional disconnect (code 1000)
      
      // Wait to ensure no reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const finalStats = wsManager.getStats();
      expect(finalStats.connectionAttempts).toBe(initialStats.connectionAttempts);
    });

    it('should stop reconnecting after max attempts', async () => {
      MockWebSocket.setConnectionBehavior(true); // Always fail
      
      try {
        await wsManager.connect();
      } catch (error) {
        // Expected to fail
      }
      
      // Wait for all reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const stats = wsManager.getStats();
      expect(stats.connectionAttempts).toBeLessThanOrEqual(config.reconnectAttempts);
      expect(wsManager.getConnectionState()).toBe('error');
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await wsManager.connect();
      mockWebSocket = (global as any).WebSocket.prototype;
    });

    it('should send messages when connected', () => {
      const message: Omit<WebSocketMessage, 'id' | 'timestamp'> = {
        type: 'test-message',
        service: 'test-service',
        target: 'target-service',
        payload: { data: 'test data' }
      };

      wsManager.send(message);
      
      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages).toHaveLength(1);
      
      const sentMessage = JSON.parse(sentMessages[0]);
      expect(sentMessage).toMatchObject({
        type: 'test-message',
        service: 'test-service',
        target: 'target-service',
        payload: { data: 'test data' }
      });
      expect(sentMessage.id).toBeDefined();
      expect(sentMessage.timestamp).toBeDefined();
    });

    it('should queue messages when disconnected', () => {
      wsManager.disconnect();
      
      const message: Omit<WebSocketMessage, 'id' | 'timestamp'> = {
        type: 'queued-message',
        service: 'test-service',
        payload: { data: 'queued data' }
      };

      wsManager.send(message);
      
      const stats = wsManager.getStats();
      expect(stats.queuedMessages).toBe(1);
    });

    it('should process queued messages on reconnection', async () => {
      // Disconnect and queue a message
      wsManager.disconnect();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      wsManager.send({
        type: 'queued-message',
        service: 'test-service',
        payload: { data: 'queued data' }
      });
      
      expect(wsManager.getStats().queuedMessages).toBe(1);
      
      // Reconnect
      await wsManager.connect();
      mockWebSocket = (global as any).WebSocket.prototype;
      
      // Wait for queue processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages.length).toBeGreaterThan(0);
      expect(wsManager.getStats().queuedMessages).toBe(0);
    });

    it('should handle incoming messages and route to event bus', () => {
      const eventHandler = jest.fn();
      eventBusManager.subscribe('websocket:message', eventHandler, 'websocket-test');
      
      const incomingMessage = {
        id: 'msg-123',
        type: 'investigation-started',
        service: 'autonomous-investigation',
        payload: {
          investigation: {
            id: 'inv-123',
            status: 'started'
          }
        },
        timestamp: new Date().toISOString()
      };
      
      mockWebSocket.simulateMessage(incomingMessage);
      
      expect(eventHandler).toHaveBeenCalledWith({
        type: 'investigation-started',
        data: incomingMessage.payload
      });
    });
  });

  describe('Service Subscriptions', () => {
    beforeEach(async () => {
      await wsManager.connect();
      mockWebSocket = (global as any).WebSocket.prototype;
    });

    it('should send subscription messages for service events', () => {
      const handler = jest.fn();
      const unsubscribe = wsManager.subscribe('investigation', ['investigation-started', 'investigation-completed'], handler);
      
      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages).toHaveLength(1);
      
      const subscriptionMessage = JSON.parse(sentMessages[0]);
      expect(subscriptionMessage).toMatchObject({
        type: 'subscribe',
        service: 'shell',
        target: 'investigation',
        payload: {
          events: ['investigation-started', 'investigation-completed']
        }
      });
      
      // Test unsubscription
      unsubscribe();
      
      const allMessages = mockWebSocket.getSentMessages();
      expect(allMessages).toHaveLength(2);
      
      const unsubscriptionMessage = JSON.parse(allMessages[1]);
      expect(unsubscriptionMessage.type).toBe('unsubscribe');
    });

    it('should route subscribed messages to handlers', () => {
      const handler = jest.fn();
      wsManager.subscribe('agent-analytics', ['agent-execution', 'performance-updated'], handler);
      
      const message: WebSocketMessage = {
        id: 'msg-456',
        type: 'agent-execution',
        service: 'agent-analytics',
        payload: {
          agentId: 'agent-123',
          execution: {
            id: 'exec-456',
            status: 'running'
          }
        },
        timestamp: new Date()
      };
      
      mockWebSocket.simulateMessage(message);
      
      expect(handler).toHaveBeenCalledWith(message);
    });
  });

  describe('Broadcast and Service Messaging', () => {
    beforeEach(async () => {
      await wsManager.connect();
      mockWebSocket = (global as any).WebSocket.prototype;
    });

    it('should broadcast messages to all services', () => {
      wsManager.broadcast('system-alert', { severity: 'high', message: 'System maintenance starting' });
      
      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages).toHaveLength(1);
      
      const broadcastMessage = JSON.parse(sentMessages[0]);
      expect(broadcastMessage).toMatchObject({
        type: 'broadcast',
        service: 'shell',
        payload: {
          eventType: 'system-alert',
          data: {
            severity: 'high',
            message: 'System maintenance starting'
          }
        }
      });
    });

    it('should send targeted messages to specific services', () => {
      wsManager.sendToService('visualization', 'update-chart', {
        chartId: 'chart-123',
        data: [1, 2, 3, 4, 5]
      });
      
      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages).toHaveLength(1);
      
      const targetMessage = JSON.parse(sentMessages[0]);
      expect(targetMessage).toMatchObject({
        type: 'service-message',
        service: 'shell',
        target: 'visualization',
        payload: {
          eventType: 'update-chart',
          data: {
            chartId: 'chart-123',
            data: [1, 2, 3, 4, 5]
          }
        }
      });
    });
  });

  describe('Heartbeat Mechanism', () => {
    it('should send heartbeat messages when connected', async () => {
      const shortHeartbeatConfig = {
        ...config,
        heartbeatInterval: 100 // Very short for testing
      };
      
      // Create new manager with short heartbeat
      (WebSocketManager as any).instance = null;
      wsManager = WebSocketManager.getInstance(shortHeartbeatConfig);
      
      await wsManager.connect();
      mockWebSocket = (global as any).WebSocket.prototype;
      
      // Wait for heartbeat
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const sentMessages = mockWebSocket.getSentMessages();
      const heartbeatMessages = sentMessages.filter(msg => {
        const parsed = JSON.parse(msg);
        return parsed.type === 'heartbeat';
      });
      
      expect(heartbeatMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await wsManager.connect();
      mockWebSocket = (global as any).WebSocket.prototype;
    });

    it('should handle WebSocket errors gracefully', () => {
      const errorHandler = jest.fn();
      eventBusManager.subscribe('service:error', errorHandler, 'websocket-test');
      
      mockWebSocket.simulateError();
      
      expect(wsManager.getConnectionState()).toBe('error');
      expect(errorHandler).toHaveBeenCalledWith({
        service: 'websocket-manager',
        error: expect.any(Error)
      });
    });

    it('should handle malformed incoming messages', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Simulate malformed message
      const malformedEvent = new MessageEvent('message', {
        data: 'invalid json{'
      });
      mockWebSocket.onmessage?.(malformedEvent);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse WebSocket message:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle send failures when connection is lost', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Disconnect
      mockWebSocket.simulateClose(1006, 'Connection lost');
      
      // Try to send message
      wsManager.send({
        type: 'test-message',
        service: 'test-service',
        payload: { data: 'test' }
      });
      
      // Message should be queued, not cause error
      const stats = wsManager.getStats();
      expect(stats.queuedMessages).toBe(1);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance and Load Testing', () => {
    beforeEach(async () => {
      await wsManager.connect();
      mockWebSocket = (global as any).WebSocket.prototype;
    });

    it('should handle rapid message sending efficiently', () => {
      const messageCount = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < messageCount; i++) {
        wsManager.send({
          type: 'performance-test',
          service: 'test-service',
          payload: { index: i }
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages).toHaveLength(messageCount);
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should handle many subscriptions efficiently', () => {
      const subscriptionCount = 50;
      const handlers: jest.Mock[] = [];
      const unsubscribers: (() => void)[] = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < subscriptionCount; i++) {
        const handler = jest.fn();
        handlers.push(handler);
        
        const unsubscribe = wsManager.subscribe(
          `service-${i}`,
          [`event-${i}`],
          handler
        );
        unsubscribers.push(unsubscribe);
      }
      
      const subscriptionTime = Date.now() - startTime;
      
      // Test message routing to all handlers
      const testMessage: WebSocketMessage = {
        id: 'test-msg',
        type: 'event-25',
        service: 'service-25',
        payload: { test: 'data' },
        timestamp: new Date()
      };
      
      mockWebSocket.simulateMessage(testMessage);
      
      // Only the matching handler should be called
      const calledHandlers = handlers.filter(h => h.mock.calls.length > 0);
      expect(calledHandlers).toHaveLength(1);
      
      // Cleanup
      unsubscribers.forEach(unsub => unsub());
      
      expect(subscriptionTime).toBeLessThan(100); // Should be fast
    });
  });
});
