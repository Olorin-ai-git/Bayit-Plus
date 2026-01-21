/**
 * T051: Log ingestion API endpoints with batch processing and validation
 *
 * High-performance log ingestion system with batching, validation, deduplication,
 * rate limiting, and real-time processing pipeline integration.
 */

import { Request, Response } from 'express';
import {
  LoggerFactory,
  CorrelationService,
  LogLevel,
  LogDomain,
  PiiRedaction,
  type Logger,
  type LogEntry
} from '@cvplus/logging';
import { globalLogAggregationService } from '../../services/LogAggregationService';
import { globalLogShippingService } from '../../../frontend/src/services/LogShippingService';

export interface LogIngestionRequest {
  logs: LogEntry[];
  metadata?: {
    source: string;
    version?: string;
    environment?: string;
    region?: string;
    batchId?: string;
    compression?: 'gzip' | 'none';
    format?: 'json' | 'msgpack';
  };
  options?: {
    validateSchema?: boolean;
    deduplication?: boolean;
    piiRedaction?: boolean;
    processAsync?: boolean;
    priority?: 'low' | 'normal' | 'high' | 'critical';
  };
}

export interface LogIngestionResponse {
  success: boolean;
  processed: number;
  accepted: number;
  rejected: number;
  duplicates: number;
  errors: LogIngestionError[];
  metadata: {
    batchId: string;
    processingTime: number;
    correlationId: string;
    timestamp: string;
  };
  warnings?: string[];
}

export interface LogIngestionError {
  index: number;
  logId?: string;
  code: string;
  message: string;
  field?: string;
  value?: any;
}

export interface BatchIngestionStatus {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  submitted: Date;
  started?: Date;
  completed?: Date;
  totalLogs: number;
  processedLogs: number;
  acceptedLogs: number;
  rejectedLogs: number;
  duplicateLogs: number;
  errors: LogIngestionError[];
  processingTime?: number;
  estimatedCompletion?: Date;
}

export interface IngestionStats {
  totalRequests: number;
  totalLogs: number;
  acceptedLogs: number;
  rejectedLogs: number;
  duplicateLogs: number;
  averageProcessingTime: number;
  requestsPerSecond: number;
  logsPerSecond: number;
  errorRate: number;
  topSources: Array<{ source: string; count: number; }>;
  topErrors: Array<{ code: string; count: number; message: string; }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

const logger: Logger = LoggerFactory.createLogger('@cvplus/ingestion-api');

// Rate limiting and batch processing configuration
const RATE_LIMITS = {
  requests: { window: 60000, limit: 1000 }, // 1000 requests per minute
  logs: { window: 60000, limit: 100000 }, // 100k logs per minute
  bytes: { window: 60000, limit: 100 * 1024 * 1024 } // 100MB per minute
};

const BATCH_LIMITS = {
  maxLogs: 10000, // Maximum logs per request
  maxSize: 50 * 1024 * 1024, // 50MB maximum payload
  maxFields: 100, // Maximum fields per log entry
  maxFieldSize: 32 * 1024 // 32KB per field
};

// In-memory stores (in production, use Redis or similar)
const rateLimitCounters = new Map<string, { count: number; logs: number; bytes: number; reset: Date }>();
const batchStatus = new Map<string, BatchIngestionStatus>();
const recentLogHashes = new Set<string>(); // For deduplication
const piiRedaction = new PiiRedaction();

/**
 * POST /api/v1/logs/ingest - Ingest logs with validation and processing
 */
export const ingestLogs = async (req: Request, res: Response): Promise<void> => {
  const correlationId = CorrelationService.getCurrentCorrelationId();
  const startTime = Date.now();

  try {
    // Parse request
    const ingestionRequest: LogIngestionRequest = req.body;

    logger.info('Log ingestion request received', {
      event: 'logs.ingestion.request',
      logCount: ingestionRequest.logs?.length || 0,
      source: ingestionRequest.metadata?.source,
      hasMetadata: !!ingestionRequest.metadata,
      hasOptions: !!ingestionRequest.options,
      contentLength: req.get('Content-Length'),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      correlationId
    });

    // Validate request structure
    validateIngestionRequest(ingestionRequest);

    // Check authentication and permissions
    await validateIngestionPermissions(req);

    // Check rate limiting
    const rateLimitInfo = await checkRateLimit(req, ingestionRequest);

    // Set rate limiting headers
    res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateLimitInfo.reset.toISOString());

    if (rateLimitInfo.retryAfter) {
      res.setHeader('Retry-After', rateLimitInfo.retryAfter.toString());
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          retryAfter: rateLimitInfo.retryAfter
        },
        metadata: { correlationId }
      });
    }

    // Process logs
    const response = await processLogIngestion(ingestionRequest, correlationId);

    // Update rate limiting counters
    await updateRateLimit(req, ingestionRequest, response);

    logger.info('Log ingestion completed', {
      event: 'logs.ingestion.completed',
      processed: response.processed,
      accepted: response.accepted,
      rejected: response.rejected,
      duplicates: response.duplicates,
      errorCount: response.errors.length,
      processingTime: response.metadata.processingTime,
      correlationId
    });

    // Set response headers
    res.setHeader('X-Batch-ID', response.metadata.batchId);
    res.setHeader('X-Processing-Time', response.metadata.processingTime.toString());

    res.status(200).json(response);

  } catch (error) {
    logger.logError('Log ingestion failed', error, {
      event: 'logs.ingestion.failed',
      processingTime: Date.now() - startTime,
      correlationId
    });

    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INGESTION_FAILED',
        message: error.message || 'Log ingestion failed'
      },
      metadata: {
        correlationId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * POST /api/v1/logs/ingest/batch - Async batch ingestion for large volumes
 */
export const ingestLogsBatch = async (req: Request, res: Response): Promise<void> => {
  const correlationId = CorrelationService.getCurrentCorrelationId();

  try {
    const ingestionRequest: LogIngestionRequest = req.body;

    logger.info('Async batch ingestion request', {
      event: 'logs.ingestion.batch_request',
      logCount: ingestionRequest.logs?.length || 0,
      source: ingestionRequest.metadata?.source,
      correlationId
    });

    // Validate request
    validateIngestionRequest(ingestionRequest);
    await validateIngestionPermissions(req);

    // Check rate limiting
    const rateLimitInfo = await checkRateLimit(req, ingestionRequest);
    if (rateLimitInfo.retryAfter) {
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded' }
      });
    }

    // Create batch status
    const batchId = generateBatchId();
    const status: BatchIngestionStatus = {
      batchId,
      status: 'pending',
      submitted: new Date(),
      totalLogs: ingestionRequest.logs.length,
      processedLogs: 0,
      acceptedLogs: 0,
      rejectedLogs: 0,
      duplicateLogs: 0,
      errors: [],
      estimatedCompletion: new Date(Date.now() + (ingestionRequest.logs.length * 10)) // 10ms per log estimate
    };

    batchStatus.set(batchId, status);

    // Process async
    processLogIngestionAsync(ingestionRequest, batchId, correlationId);

    res.status(202).json({
      success: true,
      batchId,
      status: 'pending',
      estimatedCompletion: status.estimatedCompletion,
      statusUrl: `/api/v1/logs/ingest/batch/${batchId}`,
      metadata: {
        correlationId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.logError('Batch ingestion request failed', error, {
      event: 'logs.ingestion.batch_failed',
      correlationId
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'BATCH_INGESTION_FAILED',
        message: error.message || 'Batch ingestion failed'
      }
    });
  }
};

/**
 * GET /api/v1/logs/ingest/batch/:batchId - Get batch status
 */
export const getBatchStatus = async (req: Request, res: Response): Promise<void> => {
  const correlationId = CorrelationService.getCurrentCorrelationId();
  const { batchId } = req.params;

  try {
    const status = batchStatus.get(batchId);
    if (!status) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BATCH_NOT_FOUND',
          message: 'Batch not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: status,
      metadata: {
        correlationId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.logError('Batch status retrieval failed', error, {
      event: 'logs.ingestion.batch_status_failed',
      batchId,
      correlationId
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_STATUS_FAILED',
        message: 'Failed to retrieve batch status'
      }
    });
  }
};

/**
 * GET /api/v1/logs/ingest/stats - Get ingestion statistics
 */
export const getIngestionStats = async (req: Request, res: Response): Promise<void> => {
  const correlationId = CorrelationService.getCurrentCorrelationId();

  try {
    const { timeRange = '1h' } = req.query;

    await validateIngestionPermissions(req);

    const stats = await calculateIngestionStats(timeRange as string);

    res.status(200).json({
      success: true,
      data: stats,
      metadata: {
        correlationId,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.logError('Ingestion stats failed', error, {
      event: 'logs.ingestion.stats_failed',
      correlationId
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'INGESTION_STATS_FAILED',
        message: error.message || 'Failed to retrieve ingestion statistics'
      }
    });
  }
};

/**
 * Process log ingestion synchronously
 */
async function processLogIngestion(request: LogIngestionRequest, correlationId: string): Promise<LogIngestionResponse> {
  const startTime = Date.now();
  const batchId = request.metadata?.batchId || generateBatchId();

  const response: LogIngestionResponse = {
    success: true,
    processed: 0,
    accepted: 0,
    rejected: 0,
    duplicates: 0,
    errors: [],
    metadata: {
      batchId,
      processingTime: 0,
      correlationId,
      timestamp: new Date().toISOString()
    },
    warnings: []
  };

  const options = request.options || {};
  const validatedLogs: LogEntry[] = [];

  // Process each log entry
  for (let i = 0; i < request.logs.length; i++) {
    const log = request.logs[i];
    response.processed++;

    try {
      // Validate log entry
      if (options.validateSchema !== false) {
        validateLogEntry(log, i);
      }

      // Check for duplicates
      if (options.deduplication !== false) {
        const logHash = generateLogHash(log);
        if (recentLogHashes.has(logHash)) {
          response.duplicates++;
          continue;
        }
        recentLogHashes.add(logHash);

        // Clean up old hashes (keep last 10000)
        if (recentLogHashes.size > 10000) {
          const oldHashes = Array.from(recentLogHashes).slice(0, 1000);
          oldHashes.forEach(hash => recentLogHashes.delete(hash));
        }
      }

      // Apply PII redaction
      if (options.piiRedaction !== false) {
        log.message = piiRedaction.redact(log.message);
        if (log.context) {
          log.context = JSON.parse(piiRedaction.redact(JSON.stringify(log.context)));
        }
      }

      // Enrich log entry
      enrichLogEntry(log, request.metadata);

      validatedLogs.push(log);
      response.accepted++;

    } catch (error) {
      response.rejected++;
      response.errors.push({
        index: i,
        logId: log.id,
        code: error.code || 'VALIDATION_FAILED',
        message: error.message,
        field: error.field,
        value: error.value
      });
    }
  }

  // Send to aggregation service if we have valid logs
  if (validatedLogs.length > 0) {
    try {
      if (options.processAsync) {
        // Fire and forget for async processing
        globalLogAggregationService.addLogs(validatedLogs).catch(error => {
          logger.logError('Async log processing failed', error, {
            batchId,
            logCount: validatedLogs.length
          });
        });
      } else {
        // Wait for processing to complete
        await globalLogAggregationService.addLogs(validatedLogs);
      }
    } catch (error) {
      logger.logError('Log aggregation failed', error, {
        batchId,
        logCount: validatedLogs.length
      });

      response.warnings?.push('Some logs may not be immediately available for search due to processing delays');
    }
  }

  response.metadata.processingTime = Date.now() - startTime;
  response.success = response.errors.length < request.logs.length * 0.5; // Success if < 50% errors

  return response;
}

/**
 * Process log ingestion asynchronously
 */
async function processLogIngestionAsync(request: LogIngestionRequest, batchId: string, correlationId: string): Promise<void> {
  const status = batchStatus.get(batchId)!;

  try {
    status.status = 'processing';
    status.started = new Date();

    const result = await processLogIngestion(request, correlationId);

    status.status = result.success ? 'completed' : 'partial';
    status.completed = new Date();
    status.processedLogs = result.processed;
    status.acceptedLogs = result.accepted;
    status.rejectedLogs = result.rejected;
    status.duplicateLogs = result.duplicates;
    status.errors = result.errors;
    status.processingTime = result.metadata.processingTime;

    logger.info('Async batch processing completed', {
      event: 'logs.ingestion.async_completed',
      batchId,
      status: status.status,
      processed: result.processed,
      accepted: result.accepted,
      correlationId
    });

  } catch (error) {
    status.status = 'failed';
    status.completed = new Date();
    status.errors.push({
      index: -1,
      code: 'BATCH_PROCESSING_FAILED',
      message: error.message
    });

    logger.logError('Async batch processing failed', error, {
      event: 'logs.ingestion.async_failed',
      batchId,
      correlationId
    });
  }
}

/**
 * Validation functions
 */

function validateIngestionRequest(request: LogIngestionRequest): void {
  if (!request.logs || !Array.isArray(request.logs)) {
    throw Object.assign(new Error('logs field is required and must be an array'), {
      statusCode: 400,
      code: 'INVALID_LOGS_FIELD'
    });
  }

  if (request.logs.length === 0) {
    throw Object.assign(new Error('logs array cannot be empty'), {
      statusCode: 400,
      code: 'EMPTY_LOGS_ARRAY'
    });
  }

  if (request.logs.length > BATCH_LIMITS.maxLogs) {
    throw Object.assign(new Error(`Maximum ${BATCH_LIMITS.maxLogs} logs per request`), {
      statusCode: 400,
      code: 'TOO_MANY_LOGS'
    });
  }

  // Check payload size
  const payloadSize = JSON.stringify(request).length;
  if (payloadSize > BATCH_LIMITS.maxSize) {
    throw Object.assign(new Error(`Payload size ${payloadSize} bytes exceeds maximum ${BATCH_LIMITS.maxSize} bytes`), {
      statusCode: 400,
      code: 'PAYLOAD_TOO_LARGE'
    });
  }
}

function validateLogEntry(log: LogEntry, index: number): void {
  const errors: string[] = [];

  // Required fields
  if (!log.id) errors.push('id is required');
  if (!log.timestamp) errors.push('timestamp is required');
  if (!log.level) errors.push('level is required');
  if (!log.message) errors.push('message is required');
  if (!log.serviceName) errors.push('serviceName is required');

  // Validate field types and sizes
  if (log.id && typeof log.id !== 'string') errors.push('id must be a string');
  if (log.timestamp && !(log.timestamp instanceof Date) && !Date.parse(log.timestamp as any)) {
    errors.push('timestamp must be a valid date');
  }

  if (log.level && !Object.values(LogLevel).includes(log.level)) {
    errors.push(`level must be one of: ${Object.values(LogLevel).join(', ')}`);
  }

  if (log.domain && !Object.values(LogDomain).includes(log.domain)) {
    errors.push(`domain must be one of: ${Object.values(LogDomain).join(', ')}`);
  }

  // Size limits
  if (log.message && log.message.length > BATCH_LIMITS.maxFieldSize) {
    errors.push(`message exceeds maximum length of ${BATCH_LIMITS.maxFieldSize} characters`);
  }

  // Context validation
  if (log.context && typeof log.context === 'object') {
    const contextKeys = Object.keys(log.context);
    if (contextKeys.length > BATCH_LIMITS.maxFields) {
      errors.push(`context has too many fields (max: ${BATCH_LIMITS.maxFields})`);
    }

    for (const key of contextKeys) {
      const value = log.context[key];
      if (typeof value === 'string' && value.length > BATCH_LIMITS.maxFieldSize) {
        errors.push(`context.${key} exceeds maximum length`);
      }
    }
  }

  if (errors.length > 0) {
    throw Object.assign(new Error(errors.join(', ')), {
      statusCode: 400,
      code: 'INVALID_LOG_ENTRY',
      field: 'log',
      index
    });
  }
}

async function validateIngestionPermissions(req: Request): Promise<void> {
  const user = (req as any).user;

  // Check authentication
  const apiKey = req.get('X-API-Key') || req.get('Authorization')?.replace('Bearer ', '');
  if (!user && !apiKey) {
    throw Object.assign(new Error('Authentication required'), {
      statusCode: 401,
      code: 'AUTH_REQUIRED'
    });
  }

  // Check permissions
  if (user && !user.permissions?.includes('logs:ingest') && user.role !== 'admin') {
    throw Object.assign(new Error('Log ingestion permission required'), {
      statusCode: 403,
      code: 'INGESTION_PERMISSION_DENIED'
    });
  }

  // Validate API key if present (simplified check)
  if (apiKey && !isValidApiKey(apiKey)) {
    throw Object.assign(new Error('Invalid API key'), {
      statusCode: 401,
      code: 'INVALID_API_KEY'
    });
  }
}

/**
 * Rate limiting functions
 */

async function checkRateLimit(req: Request, request: LogIngestionRequest): Promise<RateLimitInfo> {
  const clientId = getClientId(req);
  const now = new Date();

  let counter = rateLimitCounters.get(clientId);

  // Initialize or reset counter if window expired
  if (!counter || now.getTime() > counter.reset.getTime()) {
    counter = {
      count: 0,
      logs: 0,
      bytes: 0,
      reset: new Date(now.getTime() + RATE_LIMITS.requests.window)
    };
  }

  // Calculate request size
  const requestSize = JSON.stringify(request).length;
  const logCount = request.logs.length;

  // Check limits
  const exceedsRequests = counter.count + 1 > RATE_LIMITS.requests.limit;
  const exceedsLogs = counter.logs + logCount > RATE_LIMITS.logs.limit;
  const exceedsBytes = counter.bytes + requestSize > RATE_LIMITS.bytes.limit;

  const rateLimitInfo: RateLimitInfo = {
    limit: RATE_LIMITS.requests.limit,
    remaining: Math.max(0, RATE_LIMITS.requests.limit - counter.count - 1),
    reset: counter.reset
  };

  if (exceedsRequests || exceedsLogs || exceedsBytes) {
    const timeToReset = counter.reset.getTime() - now.getTime();
    rateLimitInfo.retryAfter = Math.ceil(timeToReset / 1000);

    logger.warn('Rate limit exceeded', {
      event: 'logs.ingestion.rate_limit_exceeded',
      clientId,
      exceedsRequests,
      exceedsLogs,
      exceedsBytes,
      current: counter,
      requested: { count: 1, logs: logCount, bytes: requestSize }
    });
  }

  return rateLimitInfo;
}

async function updateRateLimit(req: Request, request: LogIngestionRequest, response: LogIngestionResponse): Promise<void> {
  const clientId = getClientId(req);
  const counter = rateLimitCounters.get(clientId);

  if (counter) {
    counter.count++;
    counter.logs += request.logs.length;
    counter.bytes += JSON.stringify(request).length;
    rateLimitCounters.set(clientId, counter);
  }
}

/**
 * Helper functions
 */

function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function generateLogHash(log: LogEntry): string {
  // Create hash from key fields to detect duplicates
  const hashData = `${log.serviceName}:${log.level}:${log.message}:${log.timestamp}`;
  return Buffer.from(hashData).toString('base64');
}

function enrichLogEntry(log: LogEntry, metadata?: LogIngestionRequest['metadata']): void {
  // Convert timestamp to Date if it's a string
  if (typeof log.timestamp === 'string') {
    log.timestamp = new Date(log.timestamp);
  }

  // Add metadata context
  if (metadata) {
    log.context = log.context || {};
    if (metadata.source) log.context.ingestionSource = metadata.source;
    if (metadata.environment) log.context.environment = metadata.environment;
    if (metadata.region) log.context.region = metadata.region;
    if (metadata.version) log.context.version = metadata.version;
  }

  // Ensure required fields have defaults
  if (!log.domain) log.domain = LogDomain.APPLICATION;
}

function getClientId(req: Request): string {
  const user = (req as any).user;
  const apiKey = req.get('X-API-Key') || req.get('Authorization')?.replace('Bearer ', '');

  if (user) return `user_${user.id}`;
  if (apiKey) return `api_${apiKey.substring(0, 8)}`;
  return `ip_${req.ip}`;
}

function isValidApiKey(apiKey: string): boolean {
  // In a real implementation, this would validate against stored API keys
  return apiKey.startsWith('cvplus_') && apiKey.length >= 32;
}

async function calculateIngestionStats(timeRange: string): Promise<IngestionStats> {
  // In a real implementation, this would query metrics from storage
  // For demonstration, return mock stats

  return {
    totalRequests: 0,
    totalLogs: 0,
    acceptedLogs: 0,
    rejectedLogs: 0,
    duplicateLogs: 0,
    averageProcessingTime: 0,
    requestsPerSecond: 0,
    logsPerSecond: 0,
    errorRate: 0,
    topSources: [],
    topErrors: [],
    timeRange: {
      start: new Date(Date.now() - 60 * 60 * 1000),
      end: new Date()
    }
  };
}

// Cleanup old data periodically
setInterval(() => {
  const now = Date.now();

  // Clean up rate limit counters
  for (const [clientId, counter] of rateLimitCounters.entries()) {
    if (now > counter.reset.getTime()) {
      rateLimitCounters.delete(clientId);
    }
  }

  // Clean up old batch statuses (keep for 24 hours)
  for (const [batchId, status] of batchStatus.entries()) {
    if (now - status.submitted.getTime() > 24 * 60 * 60 * 1000) {
      batchStatus.delete(batchId);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

export default {
  ingestLogs,
  ingestLogsBatch,
  getBatchStatus,
  getIngestionStats
};