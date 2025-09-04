# Frontend Polling Implementation Specification

## Overview

This document provides complete specifications for implementing investigation polling functionality in the frontend application. The polling mechanism provides an alternative to WebSocket connections for real-time investigation monitoring.

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Implementation Architecture](#implementation-architecture)
3. [TypeScript Types](#typescript-types)
4. [Core Implementation](#core-implementation)
5. [React Hook Implementation](#react-hook-implementation)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Testing Guidelines](#testing-guidelines)
9. [Migration from WebSocket](#migration-from-websocket)

## API Endpoints

### Base URL
```
http://127.0.0.1:8090  // Development
https://your-api-domain.com  // Production
```

### 1. Investigation Status Polling
```
GET /investigations/{investigation_id}/poll/status
```

**Parameters:**
- `user_id` (required): User identifier
- `include_participants` (optional): Include participant list (default: false)

**Response Format:**
```json
{
  "type": "investigation_status",
  "timestamp": "2025-06-24T08:50:15.123456",
  "investigation_id": "demo-investigation",
  "status": "active",
  "participants": ["user1", "user2"],
  "progress": 75,
  "active_agents": ["network_agent", "device_agent"]
}
```

### 2. Messages Polling
```
GET /investigations/{investigation_id}/poll/messages
```

**Parameters:**
- `user_id` (required): User identifier
- `since_timestamp` (optional): ISO timestamp for filtering
- `since_id` (optional): Message ID for filtering
- `limit` (optional): Maximum messages to return (default: 50, max: 100)

**Response Format:**
```json
{
  "type": "messages_poll_response",
  "timestamp": "2025-06-24T08:50:15.123456",
  "investigation_id": "demo-investigation",
  "messages": [
    {
      "id": "msg_1719224415123456_001",
      "type": "agent_started",
      "timestamp": "2025-06-24T08:50:15.123456",
      "investigation_id": "demo-investigation",
      "agent_name": "network_agent",
      "message": "Starting network analysis"
    }
  ],
  "has_more": false,
  "next_timestamp": "2025-06-24T08:50:15.123456"
}
```

### 3. Latest Data (Combined)
```
GET /investigations/{investigation_id}/poll/latest
```

**Parameters:**
- `user_id` (required): User identifier
- `include_status` (optional): Include status data (default: true)
- `include_messages` (optional): Include recent messages (default: true)
- `message_limit` (optional): Max messages to include (default: 10)

## Implementation Architecture

### Polling Strategy
```typescript
interface PollingConfig {
  baseInterval: number;        // 2000ms - Normal polling interval
  fastInterval: number;        // 500ms - Fast polling when active
  slowInterval: number;        // 5000ms - Slow polling when idle
  maxRetries: number;          // 3 - Max consecutive failures
  backoffMultiplier: number;   // 2 - Exponential backoff
  maxBackoff: number;          // 30000ms - Max backoff interval
}

const DEFAULT_CONFIG: PollingConfig = {
  baseInterval: 2000,
  fastInterval: 500,
  slowInterval: 5000,
  maxRetries: 3,
  backoffMultiplier: 2,
  maxBackoff: 30000
};
```

### Adaptive Polling Logic
- **Fast Mode**: When investigation is active or recent activity detected
- **Normal Mode**: Standard investigation monitoring
- **Slow Mode**: When investigation is idle or completed
- **Error Backoff**: Exponential backoff on consecutive failures

## TypeScript Types

```typescript
// Base message types (compatible with WebSocket messages)
interface BaseMessage {
  type: string;
  timestamp: string;
  investigation_id: string;
  id?: string;
}

interface AgentMessage extends BaseMessage {
  agent_name: string;
  message: string;
  progress?: number;
  result?: any;
}

interface UserMessage extends BaseMessage {
  user_id: string;
  message: string;
}

interface SystemMessage extends BaseMessage {
  message: string;
  level?: 'info' | 'warning' | 'error';
}

// Polling-specific types
interface InvestigationStatus extends BaseMessage {
  type: 'investigation_status';
  status: 'pending' | 'active' | 'completed' | 'error';
  participants: string[];
  progress: number;
  active_agents: string[];
}

interface MessagesResponse extends BaseMessage {
  type: 'messages_poll_response';
  messages: BaseMessage[];
  has_more: boolean;
  next_timestamp?: string;
}

interface LatestDataResponse extends BaseMessage {
  type: 'investigation_latest';
  status?: InvestigationStatus;
  messages?: BaseMessage[];
}

// Polling state management
interface PollingState {
  isPolling: boolean;
  isConnected: boolean;
  lastUpdate: string | null;
  error: string | null;
  retryCount: number;
  currentInterval: number;
}

interface InvestigationData {
  status: InvestigationStatus | null;
  messages: BaseMessage[];
  lastMessageId: string | null;
  lastTimestamp: string | null;
}
```

## Core Implementation

### 1. Polling Service Class

```typescript
class InvestigationPollingService {
  private config: PollingConfig;
  private state: PollingState;
  private data: InvestigationData;
  private timeoutId: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  
  constructor(
    private investigationId: string,
    private userId: string,
    config: Partial<PollingConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      isPolling: false,
      isConnected: false,
      lastUpdate: null,
      error: null,
      retryCount: 0,
      currentInterval: this.config.baseInterval
    };
    this.data = {
      status: null,
      messages: [],
      lastMessageId: null,
      lastTimestamp: null
    };
  }

  // Start polling
  async start(): Promise<void> {
    if (this.state.isPolling) return;
    
    this.state.isPolling = true;
    this.state.error = null;
    this.abortController = new AbortController();
    
    // Initial fetch
    await this.fetchLatestData();
    
    // Start polling loop
    this.scheduleNextPoll();
  }

  // Stop polling
  stop(): void {
    this.state.isPolling = false;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // Main polling method
  private async poll(): Promise<void> {
    if (!this.state.isPolling) return;

    try {
      // Use different strategies based on data freshness
      if (this.shouldFetchLatest()) {
        await this.fetchLatestData();
      } else {
        await this.fetchNewMessages();
      }
      
      this.handleSuccess();
    } catch (error) {
      this.handleError(error);
    }
    
    this.scheduleNextPoll();
  }

  // Fetch latest data (status + recent messages)
  private async fetchLatestData(): Promise<void> {
    const params = new URLSearchParams({
      user_id: this.userId,
      include_status: 'true',
      include_messages: 'true',
      message_limit: '20'
    });

    const response = await fetch(
      `/investigations/${this.investigationId}/poll/latest?${params}`,
      { signal: this.abortController?.signal }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: LatestDataResponse = await response.json();
    
    // Update status
    if (data.status) {
      this.data.status = data.status;
    }
    
    // Update messages
    if (data.messages && data.messages.length > 0) {
      this.mergeMessages(data.messages);
    }
    
    this.state.lastUpdate = new Date().toISOString();
  }

  // Fetch only new messages
  private async fetchNewMessages(): Promise<void> {
    const params = new URLSearchParams({
      user_id: this.userId,
      limit: '50'
    });

    // Use timestamp or message ID for filtering
    if (this.data.lastTimestamp) {
      params.set('since_timestamp', this.data.lastTimestamp);
    } else if (this.data.lastMessageId) {
      params.set('since_id', this.data.lastMessageId);
    }

    const response = await fetch(
      `/investigations/${this.investigationId}/poll/messages?${params}`,
      { signal: this.abortController?.signal }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: MessagesResponse = await response.json();
    
    if (data.messages && data.messages.length > 0) {
      this.mergeMessages(data.messages);
    }
  }

  // Merge new messages with existing ones
  private mergeMessages(newMessages: BaseMessage[]): void {
    const existingIds = new Set(this.data.messages.map(m => m.id).filter(Boolean));
    const uniqueNewMessages = newMessages.filter(m => !m.id || !existingIds.has(m.id));
    
    this.data.messages.push(...uniqueNewMessages);
    
    // Sort by timestamp
    this.data.messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Keep only last 1000 messages
    if (this.data.messages.length > 1000) {
      this.data.messages = this.data.messages.slice(-1000);
    }
    
    // Update tracking fields
    if (uniqueNewMessages.length > 0) {
      const latest = uniqueNewMessages[uniqueNewMessages.length - 1];
      this.data.lastTimestamp = latest.timestamp;
      if (latest.id) {
        this.data.lastMessageId = latest.id;
      }
    }
  }

  // Determine polling strategy
  private shouldFetchLatest(): boolean {
    // Fetch latest if:
    // - No previous data
    // - Been a while since last status update
    // - Investigation might have changed state
    
    if (!this.data.status || !this.state.lastUpdate) return true;
    
    const timeSinceUpdate = Date.now() - new Date(this.state.lastUpdate).getTime();
    const statusUpdateThreshold = 30000; // 30 seconds
    
    return timeSinceUpdate > statusUpdateThreshold;
  }

  // Success handling
  private handleSuccess(): void {
    this.state.isConnected = true;
    this.state.error = null;
    this.state.retryCount = 0;
    
    // Adjust polling interval based on activity
    this.adjustPollingInterval();
  }

  // Error handling
  private handleError(error: any): void {
    console.error('Polling error:', error);
    
    this.state.isConnected = false;
    this.state.error = error.message || 'Polling failed';
    this.state.retryCount++;
    
    // Exponential backoff
    this.state.currentInterval = Math.min(
      this.config.baseInterval * Math.pow(this.config.backoffMultiplier, this.state.retryCount),
      this.config.maxBackoff
    );
  }

  // Adaptive interval adjustment
  private adjustPollingInterval(): void {
    const recentActivity = this.hasRecentActivity();
    const isActive = this.data.status?.status === 'active';
    
    if (isActive && recentActivity) {
      this.state.currentInterval = this.config.fastInterval;
    } else if (isActive || recentActivity) {
      this.state.currentInterval = this.config.baseInterval;
    } else {
      this.state.currentInterval = this.config.slowInterval;
    }
  }

  // Check for recent activity
  private hasRecentActivity(): boolean {
    if (this.data.messages.length === 0) return false;
    
    const latestMessage = this.data.messages[this.data.messages.length - 1];
    const messageAge = Date.now() - new Date(latestMessage.timestamp).getTime();
    
    return messageAge < 60000; // 1 minute
  }

  // Schedule next poll
  private scheduleNextPoll(): void {
    if (!this.state.isPolling) return;
    
    this.timeoutId = setTimeout(() => {
      this.poll();
    }, this.state.currentInterval);
  }

  // Getters for state and data
  getState(): PollingState {
    return { ...this.state };
  }

  getData(): InvestigationData {
    return {
      status: this.data.status,
      messages: [...this.data.messages],
      lastMessageId: this.data.lastMessageId,
      lastTimestamp: this.data.lastTimestamp
    };
  }

  // Event subscription (for React integration)
  private listeners: Set<(data: InvestigationData, state: PollingState) => void> = new Set();

  subscribe(callback: (data: InvestigationData, state: PollingState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      callback(this.getData(), this.getState());
    });
  }
}
```

## React Hook Implementation

### 2. useInvestigationPolling Hook

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInvestigationPollingOptions {
  enabled?: boolean;
  config?: Partial<PollingConfig>;
  onMessage?: (message: BaseMessage) => void;
  onStatusChange?: (status: InvestigationStatus) => void;
  onError?: (error: string) => void;
}

export function useInvestigationPolling(
  investigationId: string,
  userId: string,
  options: UseInvestigationPollingOptions = {}
) {
  const {
    enabled = true,
    config = {},
    onMessage,
    onStatusChange,
    onError
  } = options;

  const [data, setData] = useState<InvestigationData>({
    status: null,
    messages: [],
    lastMessageId: null,
    lastTimestamp: null
  });

  const [state, setState] = useState<PollingState>({
    isPolling: false,
    isConnected: false,
    lastUpdate: null,
    error: null,
    retryCount: 0,
    currentInterval: 2000
  });

  const pollingServiceRef = useRef<InvestigationPollingService | null>(null);
  const previousMessagesRef = useRef<BaseMessage[]>([]);
  const previousStatusRef = useRef<InvestigationStatus | null>(null);

  // Initialize polling service
  useEffect(() => {
    pollingServiceRef.current = new InvestigationPollingService(
      investigationId,
      userId,
      config
    );

    const unsubscribe = pollingServiceRef.current.subscribe((newData, newState) => {
      setData(newData);
      setState(newState);

      // Trigger callbacks for new messages
      if (onMessage) {
        const newMessages = newData.messages.slice(previousMessagesRef.current.length);
        newMessages.forEach(onMessage);
      }

      // Trigger callback for status changes
      if (onStatusChange && newData.status && 
          newData.status !== previousStatusRef.current) {
        onStatusChange(newData.status);
      }

      // Trigger error callback
      if (onError && newState.error && 
          newState.error !== state.error) {
        onError(newState.error);
      }

      previousMessagesRef.current = newData.messages;
      previousStatusRef.current = newData.status;
    });

    return () => {
      unsubscribe();
      pollingServiceRef.current?.stop();
    };
  }, [investigationId, userId]);

  // Start/stop polling based on enabled flag
  useEffect(() => {
    if (enabled && pollingServiceRef.current) {
      pollingServiceRef.current.start();
    } else if (!enabled && pollingServiceRef.current) {
      pollingServiceRef.current.stop();
    }
  }, [enabled]);

  // Manual refresh
  const refresh = useCallback(async () => {
    if (pollingServiceRef.current) {
      await pollingServiceRef.current.fetchLatestData();
    }
  }, []);

  // Manual start/stop
  const start = useCallback(async () => {
    if (pollingServiceRef.current) {
      await pollingServiceRef.current.start();
    }
  }, []);

  const stop = useCallback(() => {
    if (pollingServiceRef.current) {
      pollingServiceRef.current.stop();
    }
  }, []);

  return {
    // Data
    status: data.status,
    messages: data.messages,
    
    // State
    isPolling: state.isPolling,
    isConnected: state.isConnected,
    error: state.error,
    lastUpdate: state.lastUpdate,
    
    // Actions
    refresh,
    start,
    stop
  };
}
```

### 3. React Component Example

```typescript
import React from 'react';
import { useInvestigationPolling } from './useInvestigationPolling';

interface InvestigationDashboardProps {
  investigationId: string;
  userId: string;
}

export const InvestigationDashboard: React.FC<InvestigationDashboardProps> = ({
  investigationId,
  userId
}) => {
  const {
    status,
    messages,
    isPolling,
    isConnected,
    error,
    lastUpdate,
    refresh,
    start,
    stop
  } = useInvestigationPolling(investigationId, userId, {
    onMessage: (message) => {
      console.log('New message:', message);
      // Handle new message (notifications, etc.)
    },
    onStatusChange: (newStatus) => {
      console.log('Status changed:', newStatus);
      // Handle status change
    },
    onError: (error) => {
      console.error('Polling error:', error);
      // Handle error (show notification, etc.)
    }
  });

  return (
    <div className="investigation-dashboard">
      {/* Connection Status */}
      <div className="connection-status">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢' : '🔴'}
        </span>
        <span>
          {isPolling ? 'Polling...' : 'Stopped'}
          {lastUpdate && ` (Last update: ${new Date(lastUpdate).toLocaleTimeString()})`}
        </span>
        {error && <span className="error">Error: {error}</span>}
      </div>

      {/* Controls */}
      <div className="controls">
        <button onClick={start} disabled={isPolling}>
          Start Polling
        </button>
        <button onClick={stop} disabled={!isPolling}>
          Stop Polling
        </button>
        <button onClick={refresh}>
          Refresh Now
        </button>
      </div>

      {/* Investigation Status */}
      {status && (
        <div className="investigation-status">
          <h3>Investigation Status</h3>
          <p>Status: <strong>{status.status}</strong></p>
          <p>Progress: <strong>{status.progress}%</strong></p>
          <p>Active Agents: {status.active_agents.join(', ')}</p>
          <p>Participants: {status.participants.join(', ')}</p>
        </div>
      )}

      {/* Messages */}
      <div className="messages">
        <h3>Messages ({messages.length})</h3>
        <div className="message-list">
          {messages.map((message, index) => (
            <div key={message.id || index} className={`message message-${message.type}`}>
              <div className="message-header">
                <span className="message-type">{message.type}</span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
                {'agent_name' in message && (
                  <span className="agent-name">{message.agent_name}</span>
                )}
              </div>
              <div className="message-content">
                {message.message || JSON.stringify(message, null, 2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## Error Handling

### Error Types and Handling

```typescript
enum PollingErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  ABORT_ERROR = 'ABORT_ERROR'
}

interface PollingError {
  type: PollingErrorType;
  message: string;
  statusCode?: number;
  retryable: boolean;
}

class PollingErrorHandler {
  static handleError(error: any): PollingError {
    if (error.name === 'AbortError') {
      return {
        type: PollingErrorType.ABORT_ERROR,
        message: 'Request was aborted',
        retryable: false
      };
    }

    if (error.name === 'TimeoutError') {
      return {
        type: PollingErrorType.TIMEOUT_ERROR,
        message: 'Request timed out',
        retryable: true
      };
    }

    if (error.message?.includes('HTTP')) {
      const statusMatch = error.message.match(/HTTP (\d+)/);
      const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;
      
      return {
        type: PollingErrorType.HTTP_ERROR,
        message: error.message,
        statusCode,
        retryable: statusCode >= 500 || statusCode === 429
      };
    }

    if (error instanceof SyntaxError) {
      return {
        type: PollingErrorType.PARSE_ERROR,
        message: 'Failed to parse response',
        retryable: false
      };
    }

    return {
      type: PollingErrorType.NETWORK_ERROR,
      message: error.message || 'Network error',
      retryable: true
    };
  }
}
```

## Performance Optimization

### 1. Message Deduplication
```typescript
class MessageDeduplicator {
  private seenMessages = new Set<string>();
  private maxSize = 10000;

  isDuplicate(message: BaseMessage): boolean {
    const key = this.getMessageKey(message);
    
    if (this.seenMessages.has(key)) {
      return true;
    }
    
    this.seenMessages.add(key);
    
    // Prevent memory leak
    if (this.seenMessages.size > this.maxSize) {
      const keysToDelete = Array.from(this.seenMessages).slice(0, 1000);
      keysToDelete.forEach(key => this.seenMessages.delete(key));
    }
    
    return false;
  }

  private getMessageKey(message: BaseMessage): string {
    return message.id || `${message.type}_${message.timestamp}_${message.investigation_id}`;
  }
}
```

### 2. Smart Polling Intervals
```typescript
class AdaptivePollingManager {
  private intervals = {
    FAST: 500,     // High activity
    NORMAL: 2000,  // Normal activity
    SLOW: 5000,    // Low activity
    IDLE: 10000    // No activity
  };

  calculateInterval(data: InvestigationData, state: PollingState): number {
    const now = Date.now();
    
    // Fast polling if investigation is active
    if (data.status?.status === 'active') {
      return this.intervals.FAST;
    }
    
    // Check for recent messages
    if (data.messages.length > 0) {
      const lastMessage = data.messages[data.messages.length - 1];
      const messageAge = now - new Date(lastMessage.timestamp).getTime();
      
      if (messageAge < 30000) return this.intervals.FAST;    // 30 seconds
      if (messageAge < 120000) return this.intervals.NORMAL; // 2 minutes
      if (messageAge < 600000) return this.intervals.SLOW;   // 10 minutes
    }
    
    return this.intervals.IDLE;
  }
}
```

## Testing Guidelines

### 1. Unit Tests
```typescript
describe('InvestigationPollingService', () => {
  let service: InvestigationPollingService;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    service = new InvestigationPollingService('test-id', 'user-id');
  });

  it('should fetch latest data on start', async () => {
    const mockResponse = {
      type: 'investigation_latest',
      timestamp: '2025-06-24T08:50:15.123456',
      investigation_id: 'test-id',
      status: { status: 'active', progress: 50 },
      messages: []
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);

    await service.start();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/investigations/test-id/poll/latest'),
      expect.any(Object)
    );
  });

  it('should handle network errors gracefully', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    await service.start();
    
    const state = service.getState();
    expect(state.error).toBe('Network error');
    expect(state.isConnected).toBe(false);
  });
});
```

### 2. Integration Tests
```typescript
describe('useInvestigationPolling', () => {
  it('should start polling when enabled', () => {
    const { result } = renderHook(() => 
      useInvestigationPolling('test-id', 'user-id', { enabled: true })
    );

    expect(result.current.isPolling).toBe(true);
  });

  it('should call onMessage for new messages', async () => {
    const onMessage = jest.fn();
    
    renderHook(() => 
      useInvestigationPolling('test-id', 'user-id', { onMessage })
    );

    // Simulate new message
    await waitFor(() => {
      expect(onMessage).toHaveBeenCalled();
    });
  });
});
```

## Migration from WebSocket

### Compatibility Layer
```typescript
class WebSocketCompatibilityLayer {
  private pollingService: InvestigationPollingService;
  private eventEmitter = new EventTarget();

  constructor(investigationId: string, userId: string) {
    this.pollingService = new InvestigationPollingService(investigationId, userId);
    
    // Convert polling updates to WebSocket-like events
    this.pollingService.subscribe((data, state) => {
      // Emit connection events
      if (state.isConnected !== this.lastConnectedState) {
        const event = state.isConnected ? 'open' : 'close';
        this.eventEmitter.dispatchEvent(new CustomEvent(event));
        this.lastConnectedState = state.isConnected;
      }
      
      // Emit message events
      const newMessages = data.messages.slice(this.lastMessageCount);
      newMessages.forEach(message => {
        this.eventEmitter.dispatchEvent(
          new CustomEvent('message', { detail: message })
        );
      });
      this.lastMessageCount = data.messages.length;
    });
  }

  // WebSocket-like API
  addEventListener(type: string, listener: EventListener) {
    this.eventEmitter.addEventListener(type, listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.eventEmitter.removeEventListener(type, listener);
  }

  close() {
    this.pollingService.stop();
  }

  // Start the polling (equivalent to WebSocket connection)
  connect() {
    return this.pollingService.start();
  }
}
```

### Migration Steps
1. **Phase 1**: Implement polling alongside existing WebSocket
2. **Phase 2**: Add feature flag to switch between WebSocket and polling
3. **Phase 3**: Test polling in production with subset of users
4. **Phase 4**: Gradually migrate all users to polling
5. **Phase 5**: Remove WebSocket code (optional)

## Best Practices

### 1. Resource Management
- Always clean up polling services in component unmount
- Use AbortController for request cancellation
- Implement proper memory management for message storage

### 2. User Experience
- Show clear connection status indicators
- Implement retry mechanisms with user feedback
- Provide manual refresh options
- Handle offline/online state changes

### 3. Performance
- Use adaptive polling intervals based on activity
- Implement message deduplication
- Limit message history to prevent memory leaks
- Use efficient data structures for message storage

### 4. Error Handling
- Distinguish between retryable and non-retryable errors
- Implement exponential backoff for retries
- Provide meaningful error messages to users
- Log errors for debugging

### 5. Security
- Validate all API responses
- Sanitize message content before display
- Implement proper authentication headers
- Handle token refresh scenarios

This specification provides a complete foundation for implementing robust investigation polling in your frontend application. The implementation is designed to be compatible with existing WebSocket message formats while providing better reliability and easier debugging capabilities. 