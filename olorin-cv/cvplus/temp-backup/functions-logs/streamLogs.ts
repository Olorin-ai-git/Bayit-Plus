/**
 * T050: Real-time log streaming endpoints with WebSocket support
 *
 * Advanced real-time log streaming system with WebSocket connections,
 * filtered subscriptions, backpressure handling, and connection management.
 */

import { Request, Response } from 'express';
import * as WebSocket from 'ws';
import {
  LoggerFactory,
  CorrelationService,
  LogLevel,
  LogDomain,
  type Logger,
  type LogEntry
} from '@cvplus/logging';
import {
  LogStreamManager,
  globalStreamManager,
  type LogStream,
  type StreamFilter,
  StreamType
} from '../../services/LogStreamManager';

export interface StreamSubscription {
  id: string;
  connectionId: string;
  userId?: string;
  filters: StreamFilter[];
  createdAt: Date;
  lastActivity: Date;
  messagesSent: number;
  bytesTransferred: number;
  backpressureActive: boolean;
  metadata: {
    userAgent?: string;
    ip?: string;
    sessionId?: string;
  };
}

export interface StreamConnection {
  id: string;
  ws: WebSocket;
  userId?: string;
  subscriptions: Map<string, StreamSubscription>;
  isAuthenticated: boolean;
  connectionTime: Date;
  lastPing: Date;
  messageQueue: StreamMessage[];
  queueSize: number;
  maxQueueSize: number;
  rateLimitTokens: number;
  rateLimitLastRefill: Date;
  metadata: {
    userAgent?: string;
    ip?: string;
    version?: string;
  };
}

export interface StreamMessage {
  id: string;
  type: 'log' | 'heartbeat' | 'error' | 'subscription' | 'system';
  timestamp: Date;
  data: any;
  subscriptionId?: string;
  priority: number; // 0 = highest, higher numbers = lower priority
  retryCount: number;
  maxRetries: number;
}

export interface StreamStats {
  totalConnections: number;
  authenticatedConnections: number;
  totalSubscriptions: number;
  activeStreams: number;
  messagesPerSecond: number;
  bytesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  connectionsByUser: Record<string, number>;
  subscriptionsByFilter: Record<string, number>;
  backpressureConnections: number;
}

export interface LogStreamRequest {
  action: 'subscribe' | 'unsubscribe' | 'pause' | 'resume' | 'ping';
  subscriptionId?: string;
  filters?: {
    level?: LogLevel[];
    domain?: LogDomain[];
    serviceName?: string[];
    userId?: string[];
    correlationId?: string[];
    keywords?: string[];
    timeRange?: {
      start?: Date;
      end?: Date;
    };
    sampleRate?: number; // 0.0 to 1.0
    maxRate?: number; // messages per second
  };
  options?: {
    includeContext?: boolean;
    batchSize?: number;
    format?: 'json' | 'compact' | 'raw';
    compression?: boolean;
  };
}

export interface LogStreamResponse {
  type: 'success' | 'error' | 'log' | 'batch' | 'heartbeat' | 'system';
  subscriptionId?: string;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    timestamp: Date;
    messageId: string;
    correlationId?: string;
  };
}

const logger: Logger = LoggerFactory.createLogger('@cvplus/stream-api');

// Connection management
const connections = new Map<string, StreamConnection>();
const userConnections = new Map<string, Set<string>>(); // userId -> Set<connectionId>

// Rate limiting configuration
const RATE_LIMIT_TOKENS = 100; // tokens per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_REFILL_RATE = 1.67; // tokens per second

// Queue management
const DEFAULT_MAX_QUEUE_SIZE = 1000;
const HIGH_PRIORITY_QUEUE_SIZE = 100;

/**
 * WebSocket upgrade handler for log streaming
 */
export const handleWebSocketUpgrade = (ws: WebSocket, req: Request): void => {
  const correlationId = CorrelationService.generateCorrelationId();
  const connectionId = generateConnectionId();

  logger.info('WebSocket connection established', {
    event: 'stream.connection.established',
    connectionId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    correlationId
  });

  // Create connection object
  const connection: StreamConnection = {
    id: connectionId,
    ws,
    subscriptions: new Map(),
    isAuthenticated: false,
    connectionTime: new Date(),
    lastPing: new Date(),
    messageQueue: [],
    queueSize: 0,
    maxQueueSize: DEFAULT_MAX_QUEUE_SIZE,
    rateLimitTokens: RATE_LIMIT_TOKENS,
    rateLimitLastRefill: new Date(),
    metadata: {
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }
  };

  connections.set(connectionId, connection);

  // Set up WebSocket event handlers
  setupWebSocketHandlers(ws, connection);

  // Start connection monitoring
  startConnectionMonitoring(connection);

  // Send welcome message
  sendMessage(connection, {
    id: generateMessageId(),
    type: 'system',
    timestamp: new Date(),
    data: {
      message: 'Connected to CVPlus log streaming service',
      connectionId,
      version: '1.0',
      features: ['filtering', 'batching', 'compression', 'rate-limiting']
    },
    priority: 0,
    retryCount: 0,
    maxRetries: 3
  });
};

/**
 * HTTP endpoint to get streaming statistics
 */
export const getStreamStats = async (req: Request, res: Response): Promise<void> => {
  const correlationId = CorrelationService.getCurrentCorrelationId();

  try {
    logger.info('Stream statistics request', {
      event: 'stream.stats.request',
      correlationId
    });

    await validateStreamAccessPermissions(req);

    const stats = calculateStreamStats();

    res.status(200).json({
      success: true,
      data: stats,
      metadata: {
        correlationId,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.logError('Stream statistics failed', error, {
      event: 'stream.stats.failed',
      correlationId
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get stream statistics',
        code: error.code || 'STREAM_STATS_FAILED',
        correlationId
      }
    });
  }
};

/**
 * HTTP endpoint to manage stream connections
 */
export const manageConnections = async (req: Request, res: Response): Promise<void> => {
  const correlationId = CorrelationService.getCurrentCorrelationId();
  const { action, connectionId, userId } = req.body;

  try {
    logger.info('Connection management request', {
      event: 'stream.connection.manage_request',
      action,
      connectionId,
      userId,
      correlationId
    });

    await validateStreamManagePermissions(req);

    let result;
    switch (action) {
      case 'disconnect':
        result = await disconnectConnection(connectionId);
        break;
      case 'disconnect-user':
        result = await disconnectUserConnections(userId);
        break;
      case 'pause':
        result = await pauseConnection(connectionId);
        break;
      case 'resume':
        result = await resumeConnection(connectionId);
        break;
      default:
        throw Object.assign(new Error(`Unsupported action: ${action}`), { statusCode: 400, code: 'INVALID_ACTION' });
    }

    res.status(200).json({
      success: true,
      data: result,
      metadata: {
        correlationId
      }
    });

  } catch (error) {
    logger.logError('Connection management failed', error, {
      event: 'stream.connection.manage_failed',
      correlationId
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message || 'Connection management failed',
        code: error.code || 'CONNECTION_MANAGE_FAILED',
        correlationId
      }
    });
  }
};

/**
 * Set up WebSocket event handlers
 */
function setupWebSocketHandlers(ws: WebSocket, connection: StreamConnection): void {
  ws.on('message', async (data: WebSocket.Data) => {
    try {
      await handleWebSocketMessage(connection, data);
    } catch (error) {
      logger.logError('WebSocket message handling failed', error, {
        event: 'stream.message.handle_failed',
        connectionId: connection.id
      });

      sendErrorMessage(connection, 'MESSAGE_HANDLE_FAILED', 'Failed to process message');
    }
  });

  ws.on('close', (code: number, reason: string) => {
    handleWebSocketClose(connection, code, reason);
  });

  ws.on('error', (error: Error) => {
    handleWebSocketError(connection, error);
  });

  ws.on('pong', () => {
    connection.lastPing = new Date();
  });
}

/**
 * Handle incoming WebSocket messages
 */
async function handleWebSocketMessage(connection: StreamConnection, data: WebSocket.Data): Promise<void> {
  // Check rate limiting
  if (!checkRateLimit(connection)) {
    sendErrorMessage(connection, 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded');
    return;
  }

  let request: LogStreamRequest;
  try {
    request = JSON.parse(data.toString());
  } catch (error) {
    sendErrorMessage(connection, 'INVALID_JSON', 'Invalid JSON format');
    return;
  }

  const correlationId = CorrelationService.generateCorrelationId();

  logger.debug('WebSocket message received', {
    event: 'stream.message.received',
    connectionId: connection.id,
    action: request.action,
    correlationId
  });

  switch (request.action) {
    case 'subscribe':
      await handleSubscribe(connection, request, correlationId);
      break;
    case 'unsubscribe':
      await handleUnsubscribe(connection, request, correlationId);
      break;
    case 'pause':
      await handlePauseSubscription(connection, request, correlationId);
      break;
    case 'resume':
      await handleResumeSubscription(connection, request, correlationId);
      break;
    case 'ping':
      await handlePing(connection, correlationId);
      break;
    default:
      sendErrorMessage(connection, 'INVALID_ACTION', `Unsupported action: ${request.action}`);
  }
}

/**
 * Handle subscription creation
 */
async function handleSubscribe(connection: StreamConnection, request: LogStreamRequest, correlationId: string): Promise<void> {
  try {
    // Validate subscription limits
    if (connection.subscriptions.size >= 10) {
      sendErrorMessage(connection, 'SUBSCRIPTION_LIMIT_EXCEEDED', 'Maximum 10 subscriptions per connection');
      return;
    }

    // Create subscription
    const subscriptionId = generateSubscriptionId();
    const subscription: StreamSubscription = {
      id: subscriptionId,
      connectionId: connection.id,
      userId: connection.userId,
      filters: convertToStreamFilters(request.filters || {}),
      createdAt: new Date(),
      lastActivity: new Date(),
      messagesSent: 0,
      bytesTransferred: 0,
      backpressureActive: false,
      metadata: connection.metadata
    };

    connection.subscriptions.set(subscriptionId, subscription);

    // Register with stream manager
    const streamId = await globalStreamManager.createStream(
      StreamType.REALTIME,
      subscription.filters,
      {
        connectionId: connection.id,
        subscriptionId,
        callback: (logs: LogEntry[]) => handleStreamedLogs(connection, subscriptionId, logs)
      }
    );

    logger.info('Subscription created', {
      event: 'stream.subscription.created',
      connectionId: connection.id,
      subscriptionId,
      streamId,
      filterCount: subscription.filters.length,
      correlationId
    });

    // Send success response
    const response: LogStreamResponse = {
      type: 'success',
      subscriptionId,
      data: {
        message: 'Subscription created successfully',
        streamId,
        filters: subscription.filters
      },
      metadata: {
        timestamp: new Date(),
        messageId: generateMessageId(),
        correlationId
      }
    };

    sendMessage(connection, {
      id: generateMessageId(),
      type: 'subscription',
      timestamp: new Date(),
      data: response,
      subscriptionId,
      priority: 1,
      retryCount: 0,
      maxRetries: 3
    });

  } catch (error) {
    logger.logError('Subscription creation failed', error, {
      event: 'stream.subscription.create_failed',
      connectionId: connection.id,
      correlationId
    });

    sendErrorMessage(connection, 'SUBSCRIPTION_FAILED', error.message);
  }
}

/**
 * Handle subscription removal
 */
async function handleUnsubscribe(connection: StreamConnection, request: LogStreamRequest, correlationId: string): Promise<void> {
  try {
    const subscriptionId = request.subscriptionId;
    if (!subscriptionId) {
      sendErrorMessage(connection, 'MISSING_SUBSCRIPTION_ID', 'Subscription ID is required');
      return;
    }

    const subscription = connection.subscriptions.get(subscriptionId);
    if (!subscription) {
      sendErrorMessage(connection, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
      return;
    }

    // Remove subscription
    connection.subscriptions.delete(subscriptionId);

    // Unregister with stream manager
    await globalStreamManager.stopStream(subscriptionId);

    logger.info('Subscription removed', {
      event: 'stream.subscription.removed',
      connectionId: connection.id,
      subscriptionId,
      messagesSent: subscription.messagesSent,
      bytesTransferred: subscription.bytesTransferred,
      correlationId
    });

    // Send success response
    const response: LogStreamResponse = {
      type: 'success',
      subscriptionId,
      data: {
        message: 'Subscription removed successfully'
      },
      metadata: {
        timestamp: new Date(),
        messageId: generateMessageId(),
        correlationId
      }
    };

    sendMessage(connection, {
      id: generateMessageId(),
      type: 'subscription',
      timestamp: new Date(),
      data: response,
      subscriptionId,
      priority: 1,
      retryCount: 0,
      maxRetries: 3
    });

  } catch (error) {
    logger.logError('Subscription removal failed', error, {
      event: 'stream.subscription.remove_failed',
      connectionId: connection.id,
      correlationId
    });

    sendErrorMessage(connection, 'UNSUBSCRIBE_FAILED', error.message);
  }
}

/**
 * Handle streamed logs from the stream manager
 */
function handleStreamedLogs(connection: StreamConnection, subscriptionId: string, logs: LogEntry[]): void {
  const subscription = connection.subscriptions.get(subscriptionId);
  if (!subscription || subscription.backpressureActive) {
    return;
  }

  // Check connection state
  if (connection.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  // Apply sampling if configured
  const sampledLogs = applySampling(logs, subscription.filters);

  if (sampledLogs.length === 0) {
    return;
  }

  // Create stream message
  const message: StreamMessage = {
    id: generateMessageId(),
    type: 'log',
    timestamp: new Date(),
    data: {
      logs: sampledLogs,
      count: sampledLogs.length,
      subscriptionId
    },
    subscriptionId,
    priority: 2, // Normal priority for log messages
    retryCount: 0,
    maxRetries: 1 // Don't retry log messages much
  };

  // Send message
  sendMessage(connection, message);

  // Update subscription stats
  subscription.messagesSent++;
  subscription.lastActivity = new Date();
  subscription.bytesTransferred += JSON.stringify(sampledLogs).length;
}

/**
 * Send message to WebSocket connection
 */
function sendMessage(connection: StreamConnection, message: StreamMessage): void {
  if (connection.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  // Check queue size for backpressure
  if (connection.queueSize >= connection.maxQueueSize) {
    handleBackpressure(connection);
    return;
  }

  try {
    const serialized = JSON.stringify(message.data);
    connection.ws.send(serialized);

    logger.debug('Message sent', {
      event: 'stream.message.sent',
      connectionId: connection.id,
      messageId: message.id,
      type: message.type,
      size: serialized.length
    });

  } catch (error) {
    logger.logError('Message send failed', error, {
      event: 'stream.message.send_failed',
      connectionId: connection.id,
      messageId: message.id
    });

    // Queue message for retry if it's important
    if (message.priority <= 1 && message.retryCount < message.maxRetries) {
      message.retryCount++;
      connection.messageQueue.push(message);
      connection.queueSize++;
    }
  }
}

/**
 * Send error message to connection
 */
function sendErrorMessage(connection: StreamConnection, code: string, message: string): void {
  const errorResponse: LogStreamResponse = {
    type: 'error',
    error: { code, message },
    metadata: {
      timestamp: new Date(),
      messageId: generateMessageId()
    }
  };

  sendMessage(connection, {
    id: generateMessageId(),
    type: 'error',
    timestamp: new Date(),
    data: errorResponse,
    priority: 0, // High priority for errors
    retryCount: 0,
    maxRetries: 3
  });
}

/**
 * Handle WebSocket close
 */
function handleWebSocketClose(connection: StreamConnection, code: number, reason: string): void {
  logger.info('WebSocket connection closed', {
    event: 'stream.connection.closed',
    connectionId: connection.id,
    code,
    reason,
    duration: Date.now() - connection.connectionTime.getTime(),
    subscriptions: connection.subscriptions.size,
    messagesSent: Array.from(connection.subscriptions.values()).reduce((sum, sub) => sum + sub.messagesSent, 0)
  });

  cleanupConnection(connection);
}

/**
 * Handle WebSocket error
 */
function handleWebSocketError(connection: StreamConnection, error: Error): void {
  logger.logError('WebSocket connection error', error, {
    event: 'stream.connection.error',
    connectionId: connection.id
  });
}

/**
 * Handle ping request
 */
async function handlePing(connection: StreamConnection, correlationId: string): Promise<void> {
  const response: LogStreamResponse = {
    type: 'heartbeat',
    data: {
      message: 'pong',
      serverTime: new Date().toISOString(),
      connectionId: connection.id
    },
    metadata: {
      timestamp: new Date(),
      messageId: generateMessageId(),
      correlationId
    }
  };

  sendMessage(connection, {
    id: generateMessageId(),
    type: 'heartbeat',
    timestamp: new Date(),
    data: response,
    priority: 1,
    retryCount: 0,
    maxRetries: 3
  });

  connection.lastPing = new Date();
}

/**
 * Handle pause/resume subscription
 */
async function handlePauseSubscription(connection: StreamConnection, request: LogStreamRequest, correlationId: string): Promise<void> {
  const subscriptionId = request.subscriptionId;
  if (!subscriptionId) {
    sendErrorMessage(connection, 'MISSING_SUBSCRIPTION_ID', 'Subscription ID is required');
    return;
  }

  const subscription = connection.subscriptions.get(subscriptionId);
  if (!subscription) {
    sendErrorMessage(connection, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    return;
  }

  subscription.backpressureActive = true;

  logger.info('Subscription paused', {
    event: 'stream.subscription.paused',
    connectionId: connection.id,
    subscriptionId,
    correlationId
  });
}

async function handleResumeSubscription(connection: StreamConnection, request: LogStreamRequest, correlationId: string): Promise<void> {
  const subscriptionId = request.subscriptionId;
  if (!subscriptionId) {
    sendErrorMessage(connection, 'MISSING_SUBSCRIPTION_ID', 'Subscription ID is required');
    return;
  }

  const subscription = connection.subscriptions.get(subscriptionId);
  if (!subscription) {
    sendErrorMessage(connection, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    return;
  }

  subscription.backpressureActive = false;

  logger.info('Subscription resumed', {
    event: 'stream.subscription.resumed',
    connectionId: connection.id,
    subscriptionId,
    correlationId
  });
}

/**
 * Cleanup connection resources
 */
function cleanupConnection(connection: StreamConnection): void {
  // Remove from connections map
  connections.delete(connection.id);

  // Remove from user connections map
  if (connection.userId) {
    const userConns = userConnections.get(connection.userId);
    if (userConns) {
      userConns.delete(connection.id);
      if (userConns.size === 0) {
        userConnections.delete(connection.userId);
      }
    }
  }

  // Clean up subscriptions
  for (const subscription of connection.subscriptions.values()) {
    globalStreamManager.stopStream(subscription.id).catch(error => {
      logger.logError('Failed to stop stream during cleanup', error, {
        streamId: subscription.id,
        connectionId: connection.id
      });
    });
  }

  connection.subscriptions.clear();
  connection.messageQueue = [];
}

/**
 * Helper functions
 */

function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function generateSubscriptionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function checkRateLimit(connection: StreamConnection): boolean {
  const now = new Date();
  const timeSinceRefill = now.getTime() - connection.rateLimitLastRefill.getTime();
  const tokensToAdd = Math.floor((timeSinceRefill / 1000) * RATE_LIMIT_REFILL_RATE);

  if (tokensToAdd > 0) {
    connection.rateLimitTokens = Math.min(RATE_LIMIT_TOKENS, connection.rateLimitTokens + tokensToAdd);
    connection.rateLimitLastRefill = now;
  }

  if (connection.rateLimitTokens <= 0) {
    return false;
  }

  connection.rateLimitTokens--;
  return true;
}

function handleBackpressure(connection: StreamConnection): void {
  logger.warn('Connection experiencing backpressure', {
    event: 'stream.backpressure.detected',
    connectionId: connection.id,
    queueSize: connection.queueSize,
    maxQueueSize: connection.maxQueueSize
  });

  // Mark all subscriptions as experiencing backpressure
  for (const subscription of connection.subscriptions.values()) {
    subscription.backpressureActive = true;
  }

  // Try to drain queue by dropping lower priority messages
  connection.messageQueue = connection.messageQueue
    .filter(msg => msg.priority <= 1) // Keep only high priority messages
    .slice(-HIGH_PRIORITY_QUEUE_SIZE); // Keep only recent high priority messages

  connection.queueSize = connection.messageQueue.length;
}

function startConnectionMonitoring(connection: StreamConnection): void {
  const heartbeatInterval = setInterval(() => {
    if (connection.ws.readyState !== WebSocket.OPEN) {
      clearInterval(heartbeatInterval);
      return;
    }

    // Check if connection is stale
    const now = Date.now();
    const lastActivity = Math.max(connection.lastPing.getTime(), connection.connectionTime.getTime());
    const timeSinceActivity = now - lastActivity;

    if (timeSinceActivity > 300000) { // 5 minutes
      logger.info('Closing stale connection', {
        event: 'stream.connection.stale',
        connectionId: connection.id,
        timeSinceActivity
      });

      connection.ws.close(1000, 'Connection stale');
      clearInterval(heartbeatInterval);
      return;
    }

    // Send ping
    try {
      connection.ws.ping();
    } catch (error) {
      logger.logError('Failed to ping connection', error, {
        connectionId: connection.id
      });
    }
  }, 60000); // 1 minute
}

function convertToStreamFilters(filters: any): StreamFilter[] {
  const streamFilters: StreamFilter[] = [];

  if (filters.level && filters.level.length > 0) {
    streamFilters.push({
      field: 'level',
      operator: 'in',
      value: filters.level
    });
  }

  if (filters.domain && filters.domain.length > 0) {
    streamFilters.push({
      field: 'domain',
      operator: 'in',
      value: filters.domain
    });
  }

  if (filters.serviceName && filters.serviceName.length > 0) {
    streamFilters.push({
      field: 'serviceName',
      operator: 'in',
      value: filters.serviceName
    });
  }

  if (filters.keywords && filters.keywords.length > 0) {
    streamFilters.push({
      field: 'message',
      operator: 'contains',
      value: filters.keywords.join('|')
    });
  }

  return streamFilters;
}

function applySampling(logs: LogEntry[], filters: StreamFilter[]): LogEntry[] {
  // Apply sampling rate if specified
  const sampleRateFilter = filters.find(f => f.field === 'sampleRate');
  if (sampleRateFilter) {
    const sampleRate = parseFloat(sampleRateFilter.value);
    return logs.filter(() => Math.random() < sampleRate);
  }

  return logs;
}

function calculateStreamStats(): StreamStats {
  const totalConnections = connections.size;
  const authenticatedConnections = Array.from(connections.values()).filter(c => c.isAuthenticated).length;
  const totalSubscriptions = Array.from(connections.values()).reduce((sum, c) => sum + c.subscriptions.size, 0);

  return {
    totalConnections,
    authenticatedConnections,
    totalSubscriptions,
    activeStreams: totalSubscriptions, // Simplified
    messagesPerSecond: 0, // Would be calculated from recent activity
    bytesPerSecond: 0, // Would be calculated from recent activity
    averageLatency: 0, // Would be measured
    errorRate: 0, // Would be calculated
    connectionsByUser: {}, // Would aggregate by user
    subscriptionsByFilter: {}, // Would aggregate by filter type
    backpressureConnections: Array.from(connections.values()).filter(c =>
      Array.from(c.subscriptions.values()).some(s => s.backpressureActive)
    ).length
  };
}

async function validateStreamAccessPermissions(req: Request): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401, code: 'AUTH_REQUIRED' });
  }

  if (!user.permissions?.includes('logs:stream') && user.role !== 'admin') {
    throw Object.assign(new Error('Stream access permission required'), { statusCode: 403, code: 'STREAM_ACCESS_DENIED' });
  }
}

async function validateStreamManagePermissions(req: Request): Promise<void> {
  const user = (req as any).user;
  if (!user.permissions?.includes('logs:stream:manage') && user.role !== 'admin') {
    throw Object.assign(new Error('Stream management permission required'), { statusCode: 403, code: 'STREAM_MANAGE_DENIED' });
  }
}

async function disconnectConnection(connectionId: string): Promise<{ disconnected: boolean; connectionId: string }> {
  const connection = connections.get(connectionId);
  if (!connection) {
    throw Object.assign(new Error('Connection not found'), { statusCode: 404, code: 'CONNECTION_NOT_FOUND' });
  }

  connection.ws.close(1000, 'Disconnected by administrator');
  return { disconnected: true, connectionId };
}

async function disconnectUserConnections(userId: string): Promise<{ disconnected: number; userId: string }> {
  const userConns = userConnections.get(userId);
  if (!userConns) {
    return { disconnected: 0, userId };
  }

  let disconnected = 0;
  for (const connectionId of userConns) {
    const connection = connections.get(connectionId);
    if (connection) {
      connection.ws.close(1000, 'User disconnected by administrator');
      disconnected++;
    }
  }

  return { disconnected, userId };
}

async function pauseConnection(connectionId: string): Promise<{ paused: boolean; connectionId: string }> {
  const connection = connections.get(connectionId);
  if (!connection) {
    throw Object.assign(new Error('Connection not found'), { statusCode: 404, code: 'CONNECTION_NOT_FOUND' });
  }

  // Pause all subscriptions
  for (const subscription of connection.subscriptions.values()) {
    subscription.backpressureActive = true;
  }

  return { paused: true, connectionId };
}

async function resumeConnection(connectionId: string): Promise<{ resumed: boolean; connectionId: string }> {
  const connection = connections.get(connectionId);
  if (!connection) {
    throw Object.assign(new Error('Connection not found'), { statusCode: 404, code: 'CONNECTION_NOT_FOUND' });
  }

  // Resume all subscriptions
  for (const subscription of connection.subscriptions.values()) {
    subscription.backpressureActive = false;
  }

  return { resumed: true, connectionId };
}

export default {
  handleWebSocketUpgrade,
  getStreamStats,
  manageConnections
};