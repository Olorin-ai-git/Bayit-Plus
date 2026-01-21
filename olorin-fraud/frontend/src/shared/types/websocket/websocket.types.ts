/**
 * WebSocket Types
 * SINGLE SOURCE OF TRUTH for WebSocket-related types
 */

export type ServiceName =
  | 'shell'
  | 'investigation'
  | 'agent-analytics'
  | 'rag-intelligence'
  | 'visualization'
  | 'reporting'
  | 'core-ui'
  | 'design-system'
  | 'broadcast';

export type WebSocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectEnabled?: boolean;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  debug?: boolean;
}

export interface WebSocketMessage {
  id?: string;
  type: string;
  event?: string;
  data?: any;
  payload?: any;
  target?: ServiceName;
  source?: ServiceName;
  timestamp: Date;
  correlationId?: string;
}

export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface WebSocketSubscription {
  id: string;
  eventType: string;
  handler: (data: any) => void;
  service?: ServiceName;
  once: boolean;
  createdAt: Date;
}
