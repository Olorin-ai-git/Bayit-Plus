/**
 * T039: Logging middleware for Express functions
 *
 * Provides comprehensive request/response logging middleware for Firebase Functions
 * with automatic correlation tracking, performance monitoring, and error capture.
 */

import { Request, Response, NextFunction } from 'express';
import {
  Logger,
  LogLevel,
  createLogger
} from '../utils/cvplus-logging';

export interface RequestLoggingOptions {
  level?: LogLevel;
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  includeHeaders?: boolean;
  maxBodySize?: number;
  sensitiveHeaders?: string[];
  sensitiveFields?: string[];
  skipPaths?: string[];
  skipMethods?: string[];
}

const DEFAULT_OPTIONS: Required<RequestLoggingOptions> = {
  level: LogLevel.INFO,
  includeRequestBody: true,
  includeResponseBody: false,
  includeHeaders: true,
  maxBodySize: 10000, // 10KB max
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key', 'x-auth-token'],
  sensitiveFields: ['password', 'token', 'secret', 'key', 'apiKey'],
  skipPaths: ['/health', '/ping', '/favicon.ico'],
  skipMethods: ['OPTIONS']
};

export class RequestLogger {
  private readonly logger: Logger;
  private readonly options: Required<RequestLoggingOptions>;
  private readonly piiRedaction: PiiRedaction;

  constructor(serviceName: string, options: RequestLoggingOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.logger = LoggerFactory.createLogger(serviceName, {
      level: this.options.level,
      enableConsole: true,
      enableFirebase: true,
      enablePiiRedaction: true
    });
    this.piiRedaction = new PiiRedaction();
  }

  /**
   * Express middleware for request/response logging
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const correlationId = CorrelationService.generateCorrelationId();

      // Skip logging for specified paths and methods
      if (this.shouldSkipLogging(req)) {
        return next();
      }

      // Set correlation ID for this request context
      CorrelationService.withCorrelationId(correlationId, () => {
        // Attach correlation ID to request and response headers
        req.headers['x-correlation-id'] = correlationId;
        res.setHeader('X-Correlation-ID', correlationId);

        // Log incoming request
        this.logRequest(req, correlationId);

        // Capture response data
        const originalSend = res.send;
        const originalJson = res.json;
        let responseBody: any = null;

        // Override send method to capture response body
        res.send = function(body: any) {
          responseBody = body;
          return originalSend.call(this, body);
        };

        // Override json method to capture JSON response
        res.json = function(body: any) {
          responseBody = body;
          return originalJson.call(this, body);
        };

        // Log response when request finishes
        const cleanup = () => {
          const duration = Date.now() - startTime;
          this.logResponse(req, res, responseBody, duration, correlationId);
        };

        res.on('finish', cleanup);
        res.on('close', cleanup);
        res.on('error', (error) => {
          const duration = Date.now() - startTime;
          this.logError(req, res, error, duration, correlationId);
        });

        next();
      });
    };
  }

  private shouldSkipLogging(req: Request): boolean {
    const path = req.path || req.url;
    const method = req.method;

    return this.options.skipPaths.some(skipPath => path.startsWith(skipPath)) ||
           this.options.skipMethods.includes(method);
  }

  private logRequest(req: Request, correlationId: string): void {
    const requestData: Record<string, any> = {
      event: 'http.request.started',
      method: req.method,
      url: req.url,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      correlationId
    };

    // Include headers if enabled
    if (this.options.includeHeaders) {
      requestData.headers = this.sanitizeHeaders(req.headers);
    }

    // Include request body if enabled and present
    if (this.options.includeRequestBody && req.body) {
      const bodyString = JSON.stringify(req.body);
      if (bodyString.length <= this.options.maxBodySize) {
        requestData.body = this.sanitizeBody(req.body);
        requestData.bodySize = bodyString.length;
      } else {
        requestData.bodySize = bodyString.length;
        requestData.bodyTruncated = true;
      }
    }

    // Add query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      requestData.query = this.sanitizeBody(req.query);
    }

    // Add route parameters if available
    if (req.params && Object.keys(req.params).length > 0) {
      requestData.params = req.params;
    }

    this.logger.info('HTTP request received', requestData);
  }

  private logResponse(
    req: Request,
    res: Response,
    responseBody: any,
    duration: number,
    correlationId: string
  ): void {
    const responseData: Record<string, any> = {
      event: 'http.request.completed',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      duration,
      correlationId
    };

    // Include response body if enabled
    if (this.options.includeResponseBody && responseBody) {
      const bodyString = typeof responseBody === 'string'
        ? responseBody
        : JSON.stringify(responseBody);

      if (bodyString.length <= this.options.maxBodySize) {
        responseData.body = this.sanitizeBody(responseBody);
        responseData.bodySize = bodyString.length;
      } else {
        responseData.bodySize = bodyString.length;
        responseData.bodyTruncated = true;
      }
    }

    // Add response headers
    responseData.headers = this.sanitizeHeaders(res.getHeaders() as Record<string, string>);

    // Determine log level based on status code
    const logLevel = this.getLogLevel(res.statusCode);

    if (logLevel === LogLevel.ERROR) {
      this.logger.error('HTTP request failed', responseData);
    } else if (logLevel === LogLevel.WARN) {
      this.logger.warn('HTTP request completed with warning', responseData);
    } else {
      this.logger.info('HTTP request completed successfully', responseData);
    }
  }

  private logError(
    req: Request,
    res: Response,
    error: Error,
    duration: number,
    correlationId: string
  ): void {
    this.logger.error('HTTP request error', {
      event: 'http.request.error',
      method: req.method,
      url: req.url,
      duration,
      correlationId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }

  private sanitizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      if (this.options.sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    try {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      const redacted = this.piiRedaction.redact(bodyString);

      // Parse back to object if it was originally an object
      if (typeof body === 'object' && bodyString !== redacted) {
        return JSON.parse(redacted);
      }

      return typeof body === 'object' ? body : redacted;
    } catch (error) {
      // If sanitization fails, return safe representation
      return '[SANITIZATION_FAILED]';
    }
  }

  private getLogLevel(statusCode: number): LogLevel {
    if (statusCode >= 500) {
      return LogLevel.ERROR;
    } else if (statusCode >= 400) {
      return LogLevel.WARN;
    } else {
      return LogLevel.INFO;
    }
  }
}

/**
 * Pre-configured middleware instances
 */
export const createLoggingMiddleware = (serviceName: string, options?: RequestLoggingOptions) => {
  const requestLogger = new RequestLogger(serviceName, options);
  return requestLogger.middleware();
};

/**
 * Default Firebase Functions logging middleware
 */
export const functionsLoggingMiddleware = createLoggingMiddleware('@cvplus/functions');

/**
 * Express error handling middleware with logging
 */
export const errorLoggingMiddleware = (serviceName: string = '@cvplus/functions') => {
  const logger = LoggerFactory.createLogger(serviceName);

  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    const correlationId = CorrelationService.getCurrentCorrelationId() ||
                         req.headers['x-correlation-id'] as string ||
                         CorrelationService.generateCorrelationId();

    logger.error('Unhandled request error', {
      event: 'http.error.unhandled',
      method: req.method,
      url: req.url,
      correlationId,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      }
    });

    // Set correlation ID if not already set
    if (!res.headersSent) {
      res.setHeader('X-Correlation-ID', correlationId);
    }

    next(err);
  };
};

/**
 * Security event logging middleware
 */
export const securityLoggingMiddleware = (serviceName: string = '@cvplus/functions') => {
  const logger = LoggerFactory.createLogger(serviceName);

  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId = CorrelationService.getCurrentCorrelationId();

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\.\.\//g, // Directory traversal
      /<script/gi, // XSS attempts
      /union.*select/gi, // SQL injection
      /javascript:/gi, // JavaScript protocol
      /%3C%73%63%72%69%70%74/gi, // Encoded script tags
    ];

    const requestString = `${req.method} ${req.url} ${JSON.stringify(req.body || {})} ${JSON.stringify(req.query)}`;

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestString)) {
        logger.warn('Suspicious request detected', {
          event: 'security.suspicious.request',
          method: req.method,
          url: req.url,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          pattern: pattern.source,
          correlationId
        });
        break;
      }
    }

    next();
  };
};

export default {
  RequestLogger,
  createLoggingMiddleware,
  functionsLoggingMiddleware,
  errorLoggingMiddleware,
  securityLoggingMiddleware
};