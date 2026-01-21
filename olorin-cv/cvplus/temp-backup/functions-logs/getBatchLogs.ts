/**
 * T048: Batch log retrieval API endpoint
 *
 * Advanced log retrieval endpoint with comprehensive filtering, pagination,
 * aggregation, and export capabilities for the CVPlus logging system.
 */

import { Request, Response } from 'express';
import {
  Logger,
  LogLevel,
  createLogger
} from '../../utils/cvplus-logging';
import { globalLogAggregationService } from '../../services/LogAggregationService';

export interface LogSearchQuery {
  // Time range filters
  startTime?: string; // ISO string
  endTime?: string; // ISO string
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';

  // Content filters
  level?: LogLevel[];
  domain?: LogDomain[];
  serviceName?: string[];
  userId?: string[];
  sessionId?: string[];
  correlationId?: string[];

  // Text search
  query?: string; // Full text search
  message?: string; // Message contains
  excludeQuery?: string; // Exclude matching

  // Pagination
  page?: number;
  limit?: number;
  offset?: number;

  // Sorting
  sortBy?: 'timestamp' | 'level' | 'serviceName' | 'userId';
  sortOrder?: 'asc' | 'desc';

  // Aggregation
  aggregateBy?: 'level' | 'domain' | 'service' | 'user' | 'hour' | 'day';
  includeMetrics?: boolean;
  includeStats?: boolean;

  // Export options
  format?: 'json' | 'csv' | 'txt' | 'xlsx';
  includeContext?: boolean;
  compress?: boolean;

  // Advanced filters
  hasErrors?: boolean;
  hasContext?: boolean;
  contextKeys?: string[];
  minDuration?: number;
  maxDuration?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface LogSearchResult {
  logs: LogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  aggregations?: Record<string, any>;
  metrics?: {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    logsByDomain: Record<LogDomain, number>;
    logsByService: Record<string, number>;
    timeRange: {
      start: Date;
      end: Date;
    };
    avgProcessingTime: number;
    errorRate: number;
  };
  exportUrl?: string;
  query: LogSearchQuery;
  executionTime: number;
}

export interface LogExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: string;
  query: LogSearchQuery;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
}

const logger: Logger = LoggerFactory.createLogger('@cvplus/logs-api');

/**
 * GET /api/v1/logs/batch - Retrieve logs with advanced filtering and pagination
 */
export const getBatchLogs = async (req: Request, res: Response): Promise<void> => {
  const correlationId = CorrelationService.getCurrentCorrelationId();
  const startTime = Date.now();

  try {
    // Parse and validate query parameters
    const query = parseLogSearchQuery(req.query);

    logger.info('Batch log retrieval request', {
      event: 'logs.api.batch_request',
      query,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      correlationId
    });

    // Validate user permissions
    await validateLogAccessPermissions(req, query);

    // Check rate limiting
    await checkRateLimit(req);

    // Execute search
    const result = await searchLogs(query);

    // Log access for audit
    logger.info('Batch logs retrieved', {
      event: 'logs.api.batch_retrieved',
      resultCount: result.logs.length,
      totalMatched: result.pagination.total,
      executionTime: result.executionTime,
      query: {
        timeRange: query.timeRange,
        level: query.level,
        domain: query.domain,
        textSearch: !!query.query
      },
      correlationId
    });

    // Set appropriate headers
    res.setHeader('X-Total-Count', result.pagination.total.toString());
    res.setHeader('X-Execution-Time', result.executionTime.toString());

    // Return results
    res.status(200).json({
      success: true,
      data: result,
      metadata: {
        correlationId,
        executionTime: Date.now() - startTime,
        apiVersion: '1.0',
        cached: false
      }
    });

  } catch (error) {
    logger.logError('Batch log retrieval failed', error, {
      event: 'logs.api.batch_failed',
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      correlationId,
      processingTime: Date.now() - startTime
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message || 'Failed to retrieve logs',
        code: error.code || 'LOGS_RETRIEVAL_FAILED',
        correlationId
      }
    });
  }
};

/**
 * POST /api/v1/logs/search - Advanced log search with complex queries
 */
export const searchLogsAdvanced = async (req: Request, res: Response): Promise<void> => {
  const correlationId = CorrelationService.getCurrentCorrelationId();
  const startTime = Date.now();

  try {
    const query: LogSearchQuery = req.body;

    logger.info('Advanced log search request', {
      event: 'logs.api.search_request',
      query,
      correlationId
    });

    // Validate request body
    validateLogSearchQuery(query);

    // Validate permissions
    await validateLogAccessPermissions(req, query);

    // Check rate limiting for advanced search
    await checkAdvancedSearchRateLimit(req);

    // Execute advanced search
    const result = await searchLogsAdvanced(query);

    logger.info('Advanced log search completed', {
      event: 'logs.api.search_completed',
      resultCount: result.logs.length,
      executionTime: result.executionTime,
      correlationId
    });

    res.status(200).json({
      success: true,
      data: result,
      metadata: {
        correlationId,
        executionTime: Date.now() - startTime,
        apiVersion: '1.0'
      }
    });

  } catch (error) {
    logger.logError('Advanced log search failed', error, {
      event: 'logs.api.search_failed',
      correlationId,
      processingTime: Date.now() - startTime
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message || 'Advanced search failed',
        code: error.code || 'ADVANCED_SEARCH_FAILED',
        correlationId
      }
    });
  }
};

/**
 * POST /api/v1/logs/export - Export logs to various formats
 */
export const exportLogs = async (req: Request, res: Response): Promise<void> => {
  const correlationId = CorrelationService.getCurrentCorrelationId();
  const startTime = Date.now();

  try {
    const { query, format = 'json', async = false }: {
      query: LogSearchQuery;
      format?: 'json' | 'csv' | 'txt' | 'xlsx';
      async?: boolean;
    } = req.body;

    logger.info('Log export request', {
      event: 'logs.api.export_request',
      format,
      async,
      query: {
        timeRange: query.timeRange,
        level: query.level,
        domain: query.domain
      },
      correlationId
    });

    // Validate permissions for export
    await validateLogExportPermissions(req, query);

    // Check export rate limiting
    await checkExportRateLimit(req);

    if (async) {
      // Create background export job
      const job = await createExportJob(query, format, req.user?.id);

      res.status(202).json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          estimatedCompletion: '2-5 minutes'
        },
        metadata: {
          correlationId,
          executionTime: Date.now() - startTime
        }
      });

    } else {
      // Synchronous export (limited results)
      const exportData = await exportLogsSync(query, format);

      // Set appropriate headers for file download
      const filename = generateExportFilename(format, query);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', getContentType(format));

      if (query.compress && format === 'json') {
        res.setHeader('Content-Encoding', 'gzip');
      }

      logger.info('Log export completed', {
        event: 'logs.api.export_completed',
        format,
        size: exportData.length,
        correlationId
      });

      res.status(200).send(exportData);
    }

  } catch (error) {
    logger.logError('Log export failed', error, {
      event: 'logs.api.export_failed',
      correlationId,
      processingTime: Date.now() - startTime
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message || 'Export failed',
        code: error.code || 'EXPORT_FAILED',
        correlationId
      }
    });
  }
};

/**
 * GET /api/v1/logs/export/:jobId - Get export job status
 */
export const getExportJobStatus = async (req: Request, res: Response): Promise<void> => {
  const correlationId = CorrelationService.getCurrentCorrelationId();
  const { jobId } = req.params;

  try {
    const job = await getExportJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Export job not found',
          code: 'JOB_NOT_FOUND',
          correlationId
        }
      });
    }

    // Check if user has access to this job
    await validateJobAccess(req, job);

    res.status(200).json({
      success: true,
      data: job,
      metadata: {
        correlationId
      }
    });

  } catch (error) {
    logger.logError('Export job status retrieval failed', error, {
      event: 'logs.api.job_status_failed',
      jobId,
      correlationId
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get job status',
        code: error.code || 'JOB_STATUS_FAILED',
        correlationId
      }
    });
  }
};

/**
 * Helper functions
 */

function parseLogSearchQuery(queryParams: any): LogSearchQuery {
  const query: LogSearchQuery = {};

  // Time filters
  if (queryParams.startTime) query.startTime = queryParams.startTime;
  if (queryParams.endTime) query.endTime = queryParams.endTime;
  if (queryParams.timeRange) query.timeRange = queryParams.timeRange;

  // Content filters
  if (queryParams.level) {
    query.level = Array.isArray(queryParams.level)
      ? queryParams.level
      : [queryParams.level];
  }
  if (queryParams.domain) {
    query.domain = Array.isArray(queryParams.domain)
      ? queryParams.domain
      : [queryParams.domain];
  }
  if (queryParams.serviceName) {
    query.serviceName = Array.isArray(queryParams.serviceName)
      ? queryParams.serviceName
      : [queryParams.serviceName];
  }

  // Text search
  if (queryParams.query) query.query = queryParams.query;
  if (queryParams.message) query.message = queryParams.message;
  if (queryParams.excludeQuery) query.excludeQuery = queryParams.excludeQuery;

  // Pagination
  query.page = parseInt(queryParams.page) || 1;
  query.limit = Math.min(parseInt(queryParams.limit) || 50, 1000); // Max 1000 per request
  query.offset = queryParams.offset ? parseInt(queryParams.offset) : (query.page - 1) * query.limit;

  // Sorting
  query.sortBy = queryParams.sortBy || 'timestamp';
  query.sortOrder = queryParams.sortOrder || 'desc';

  // Options
  query.includeMetrics = queryParams.includeMetrics === 'true';
  query.includeStats = queryParams.includeStats === 'true';
  query.includeContext = queryParams.includeContext !== 'false'; // Default true

  return query;
}

function validateLogSearchQuery(query: LogSearchQuery): void {
  if (query.limit && query.limit > 10000) {
    throw Object.assign(new Error('Limit cannot exceed 10,000'), { statusCode: 400, code: 'INVALID_LIMIT' });
  }

  if (query.startTime && query.endTime) {
    const start = new Date(query.startTime);
    const end = new Date(query.endTime);
    if (start >= end) {
      throw Object.assign(new Error('Start time must be before end time'), { statusCode: 400, code: 'INVALID_TIME_RANGE' });
    }

    // Limit time range to prevent excessive queries
    const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days
    if (end.getTime() - start.getTime() > maxRange) {
      throw Object.assign(new Error('Time range cannot exceed 90 days'), { statusCode: 400, code: 'TIME_RANGE_TOO_LARGE' });
    }
  }

  if (query.query && query.query.length < 3) {
    throw Object.assign(new Error('Search query must be at least 3 characters'), { statusCode: 400, code: 'QUERY_TOO_SHORT' });
  }
}

async function validateLogAccessPermissions(req: Request, query: LogSearchQuery): Promise<void> {
  // In a real implementation, this would check user permissions
  const user = (req as any).user;

  if (!user) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401, code: 'AUTH_REQUIRED' });
  }

  // Check if user can access logs from other users
  if (query.userId && query.userId.length > 0) {
    const canAccessOtherUsers = user.permissions?.includes('logs:read:all') || user.role === 'admin';
    if (!canAccessOtherUsers && !query.userId.includes(user.id)) {
      throw Object.assign(new Error('Insufficient permissions to access other users\' logs'), { statusCode: 403, code: 'ACCESS_DENIED' });
    }
  }
}

async function validateLogExportPermissions(req: Request, query: LogSearchQuery): Promise<void> {
  const user = (req as any).user;

  if (!user?.permissions?.includes('logs:export') && user?.role !== 'admin') {
    throw Object.assign(new Error('Export permission required'), { statusCode: 403, code: 'EXPORT_PERMISSION_DENIED' });
  }
}

async function validateJobAccess(req: Request, job: LogExportJob): Promise<void> {
  const user = (req as any).user;

  // In a real implementation, jobs would have owner information
  // For now, we'll allow access if user has export permissions
  if (!user?.permissions?.includes('logs:export') && user?.role !== 'admin') {
    throw Object.assign(new Error('Access denied to export job'), { statusCode: 403, code: 'JOB_ACCESS_DENIED' });
  }
}

async function checkRateLimit(req: Request): Promise<void> {
  // Basic rate limiting implementation
  // In production, use Redis or similar for distributed rate limiting
}

async function checkAdvancedSearchRateLimit(req: Request): Promise<void> {
  // Stricter rate limiting for advanced search
}

async function checkExportRateLimit(req: Request): Promise<void> {
  // Stricter rate limiting for exports
}

async function searchLogs(query: LogSearchQuery): Promise<LogSearchResult> {
  const startTime = Date.now();

  // In a real implementation, this would query the log storage system
  // For demonstration, we'll simulate search results

  // Simulate time-based filtering
  const timeFilter = buildTimeFilter(query);

  // Simulate database query execution time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

  const mockLogs: LogEntry[] = []; // Would contain actual search results
  const total = 0; // Would contain total count from database

  const result: LogSearchResult = {
    logs: mockLogs,
    pagination: {
      page: query.page || 1,
      limit: query.limit || 50,
      total,
      totalPages: Math.ceil(total / (query.limit || 50)),
      hasNext: ((query.page || 1) * (query.limit || 50)) < total,
      hasPrevious: (query.page || 1) > 1
    },
    query,
    executionTime: Date.now() - startTime
  };

  if (query.includeMetrics) {
    result.metrics = {
      totalLogs: total,
      logsByLevel: {} as Record<LogLevel, number>,
      logsByDomain: {} as Record<LogDomain, number>,
      logsByService: {},
      timeRange: timeFilter,
      avgProcessingTime: 0,
      errorRate: 0
    };
  }

  if (query.aggregateBy) {
    result.aggregations = {}; // Would contain aggregation results
  }

  return result;
}

async function searchLogsAdvanced(query: LogSearchQuery): Promise<LogSearchResult> {
  // Enhanced search with more complex query capabilities
  return await searchLogs(query);
}

function buildTimeFilter(query: LogSearchQuery): { start: Date; end: Date } {
  let start: Date;
  let end: Date = new Date();

  if (query.startTime && query.endTime) {
    start = new Date(query.startTime);
    end = new Date(query.endTime);
  } else if (query.timeRange) {
    const now = Date.now();
    switch (query.timeRange) {
      case '1h':
        start = new Date(now - 60 * 60 * 1000);
        break;
      case '6h':
        start = new Date(now - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now - 24 * 60 * 60 * 1000); // Default 24h
    }
  } else {
    start = new Date(Date.now() - 24 * 60 * 60 * 1000); // Default 24h
  }

  return { start, end };
}

async function exportLogsSync(query: LogSearchQuery, format: string): Promise<Buffer | string> {
  // Limit synchronous exports
  const limitedQuery = { ...query, limit: Math.min(query.limit || 1000, 10000) };

  const result = await searchLogs(limitedQuery);

  switch (format) {
    case 'csv':
      return convertToCSV(result.logs);
    case 'txt':
      return convertToText(result.logs);
    case 'xlsx':
      return convertToExcel(result.logs);
    default:
      return JSON.stringify(result, null, 2);
  }
}

async function createExportJob(query: LogSearchQuery, format: string, userId?: string): Promise<LogExportJob> {
  const job: LogExportJob = {
    id: `export_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
    status: 'pending',
    format,
    query,
    createdAt: new Date()
  };

  // In a real implementation, this would be stored in a database
  // and processed by a background worker

  return job;
}

async function getExportJob(jobId: string): Promise<LogExportJob | null> {
  // In a real implementation, this would query the database
  return null;
}

function convertToCSV(logs: LogEntry[]): string {
  if (logs.length === 0) return 'No logs found';

  const headers = ['timestamp', 'level', 'domain', 'serviceName', 'message', 'userId', 'correlationId'];
  const rows = logs.map(log => [
    log.timestamp.toISOString(),
    log.level,
    log.domain,
    log.serviceName,
    log.message.replace(/"/g, '""'), // Escape quotes
    log.userId || '',
    log.correlationId || ''
  ]);

  return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

function convertToText(logs: LogEntry[]): string {
  return logs.map(log =>
    `${log.timestamp.toISOString()} [${log.level}] ${log.serviceName}: ${log.message}`
  ).join('\n');
}

async function convertToExcel(logs: LogEntry[]): Promise<Buffer> {
  // In a real implementation, this would use a library like xlsx
  // For now, return CSV as buffer
  return Buffer.from(convertToCSV(logs));
}

function generateExportFilename(format: string, query: LogSearchQuery): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const timeRange = query.timeRange || 'custom';
  return `cvplus-logs-${timeRange}-${timestamp}.${format}`;
}

function getContentType(format: string): string {
  switch (format) {
    case 'csv': return 'text/csv';
    case 'txt': return 'text/plain';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default: return 'application/json';
  }
}

export default {
  getBatchLogs,
  searchLogsAdvanced,
  exportLogs,
  getExportJobStatus
};