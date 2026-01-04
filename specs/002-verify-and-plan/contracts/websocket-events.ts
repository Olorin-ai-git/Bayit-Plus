/**
 * WebSocket Event Contracts for Manual Investigation UI
 * Real-time communication protocol definitions
 */

// Event Types
export enum WebSocketEventType {
  // Connection Events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  RECONNECT = 'reconnect',

  // Investigation Events
  INVESTIGATION_CREATED = 'investigation.created',
  INVESTIGATION_UPDATED = 'investigation.updated',
  INVESTIGATION_DELETED = 'investigation.deleted',
  INVESTIGATION_ASSIGNED = 'investigation.assigned',

  // Step Events
  STEP_STARTED = 'step.started',
  STEP_PROGRESS = 'step.progress',
  STEP_COMPLETED = 'step.completed',
  STEP_FAILED = 'step.failed',
  STEP_RETRY = 'step.retry',

  // Agent Events
  AGENT_STARTED = 'agent.started',
  AGENT_RESPONSE = 'agent.response',
  AGENT_ERROR = 'agent.error',
  AGENT_STREAMING = 'agent.streaming',

  // Risk Events
  RISK_CALCULATED = 'risk.calculated',
  RISK_UPDATED = 'risk.updated',
  RISK_ALERT = 'risk.alert',

  // Collaboration Events
  COMMENT_ADDED = 'comment.added',
  COMMENT_EDITED = 'comment.edited',
  COMMENT_DELETED = 'comment.deleted',
  USER_TYPING = 'user.typing',
  USER_JOINED = 'user.joined',
  USER_LEFT = 'user.left',

  // Report Events
  REPORT_GENERATING = 'report.generating',
  REPORT_COMPLETED = 'report.completed',
  REPORT_FAILED = 'report.failed',

  // System Events
  NOTIFICATION = 'notification',
  HEARTBEAT = 'heartbeat',
  SYNC_REQUEST = 'sync.request',
  SYNC_RESPONSE = 'sync.response',
}

// Base Event Structure
export interface WebSocketEvent<T = any> {
  type: WebSocketEventType;
  timestamp: string;
  correlationId: string;
  payload: T;
  metadata?: {
    userId?: string;
    investigationId?: string;
    source?: string;
    version?: string;
  };
}

// Connection Events
export interface ConnectEvent extends WebSocketEvent {
  type: WebSocketEventType.CONNECT;
  payload: {
    sessionId: string;
    userId: string;
    timestamp: string;
  };
}

export interface DisconnectEvent extends WebSocketEvent {
  type: WebSocketEventType.DISCONNECT;
  payload: {
    reason: string;
    code: number;
  };
}

// Investigation Events
export interface InvestigationCreatedEvent extends WebSocketEvent {
  type: WebSocketEventType.INVESTIGATION_CREATED;
  payload: {
    investigation: {
      id: string;
      entityId: string;
      entityType: string;
      status: string;
      createdBy: string;
    };
  };
}

export interface InvestigationUpdatedEvent extends WebSocketEvent {
  type: WebSocketEventType.INVESTIGATION_UPDATED;
  payload: {
    investigationId: string;
    changes: {
      field: string;
      oldValue: any;
      newValue: any;
    }[];
    updatedBy: string;
  };
}

// Step Events
export interface StepStartedEvent extends WebSocketEvent {
  type: WebSocketEventType.STEP_STARTED;
  payload: {
    investigationId: string;
    stepId: string;
    stepType: string;
    startTime: string;
  };
}

export interface StepProgressEvent extends WebSocketEvent {
  type: WebSocketEventType.STEP_PROGRESS;
  payload: {
    investigationId: string;
    stepId: string;
    progress: number; // 0-100
    message?: string;
  };
}

export interface StepCompletedEvent extends WebSocketEvent {
  type: WebSocketEventType.STEP_COMPLETED;
  payload: {
    investigationId: string;
    stepId: string;
    stepType: string;
    duration: number;
    result: {
      riskLevel: string;
      confidence: number;
      signalsFound: number;
    };
  };
}

// Agent Events
export interface AgentResponseEvent extends WebSocketEvent {
  type: WebSocketEventType.AGENT_RESPONSE;
  payload: {
    investigationId: string;
    stepId: string;
    agentType: string;
    response: {
      confidence: number;
      riskLevel: string;
      signals: any[];
      recommendations: string[];
      processingTime: number;
    };
  };
}

export interface AgentStreamingEvent extends WebSocketEvent {
  type: WebSocketEventType.AGENT_STREAMING;
  payload: {
    investigationId: string;
    stepId: string;
    agentType: string;
    chunk: string;
    isComplete: boolean;
  };
}

// Risk Events
export interface RiskCalculatedEvent extends WebSocketEvent {
  type: WebSocketEventType.RISK_CALCULATED;
  payload: {
    investigationId: string;
    riskScore: number;
    confidence: number;
    factors: {
      name: string;
      weight: number;
      contribution: number;
    }[];
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  };
}

export interface RiskAlertEvent extends WebSocketEvent {
  type: WebSocketEventType.RISK_ALERT;
  payload: {
    investigationId: string;
    alertType: 'THRESHOLD_EXCEEDED' | 'RAPID_INCREASE' | 'CRITICAL_SIGNAL';
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    actionRequired: boolean;
  };
}

// Collaboration Events
export interface CommentAddedEvent extends WebSocketEvent {
  type: WebSocketEventType.COMMENT_ADDED;
  payload: {
    investigationId: string;
    comment: {
      id: string;
      authorId: string;
      authorName: string;
      message: string;
      timestamp: string;
      mentions: string[];
    };
  };
}

export interface UserTypingEvent extends WebSocketEvent {
  type: WebSocketEventType.USER_TYPING;
  payload: {
    investigationId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
  };
}

// Report Events
export interface ReportGeneratingEvent extends WebSocketEvent {
  type: WebSocketEventType.REPORT_GENERATING;
  payload: {
    investigationId: string;
    reportId: string;
    format: string;
    estimatedTime: number; // seconds
  };
}

export interface ReportCompletedEvent extends WebSocketEvent {
  type: WebSocketEventType.REPORT_COMPLETED;
  payload: {
    investigationId: string;
    reportId: string;
    format: string;
    url: string;
    size: number;
  };
}

// System Events
export interface NotificationEvent extends WebSocketEvent {
  type: WebSocketEventType.NOTIFICATION;
  payload: {
    level: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    actionUrl?: string;
    dismissible: boolean;
  };
}

export interface HeartbeatEvent extends WebSocketEvent {
  type: WebSocketEventType.HEARTBEAT;
  payload: {
    serverTime: string;
    latency: number;
  };
}

// WebSocket Client Interface
export interface WebSocketClient {
  // Connection Management
  connect(url: string, token: string): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;

  // Event Handling
  on<T extends WebSocketEvent>(
    event: WebSocketEventType,
    handler: (data: T) => void
  ): void;

  off<T extends WebSocketEvent>(
    event: WebSocketEventType,
    handler: (data: T) => void
  ): void;

  once<T extends WebSocketEvent>(
    event: WebSocketEventType,
    handler: (data: T) => void
  ): void;

  // Sending Events
  emit<T extends WebSocketEvent>(event: T): void;

  // Request/Response Pattern
  request<TRequest, TResponse>(
    event: WebSocketEvent<TRequest>,
    timeout?: number
  ): Promise<TResponse>;

  // State Management
  isConnected(): boolean;
  getConnectionState(): 'connecting' | 'connected' | 'disconnecting' | 'disconnected';
  getLatency(): number;

  // Subscription Management
  subscribe(channel: string): void;
  unsubscribe(channel: string): void;
  getSubscriptions(): string[];
}

// WebSocket Service Configuration
export interface WebSocketConfig {
  url: string;
  reconnect: boolean;
  reconnectInterval: number;
  reconnectMaxAttempts: number;
  heartbeatInterval: number;
  requestTimeout: number;
  debug: boolean;
  authToken?: string;
}