/**
 * T020: Log formatters and PII redaction
 * CVPlus Logging System - Formatting and Data Protection
  */

import { LogEntry, ErrorInfo, PerformanceInfo, LogFormatter } from '../types/index';

// Sensitive data patterns for PII redaction
const SENSITIVE_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  token: /\b[Tt]oken[:\s]+[A-Za-z0-9+/=_-]+\b/g,
  bearer: /\b[Bb]earer\s+[A-Za-z0-9+/=_-]+\b/g,
  password: /\b[Pp]assword[:\s]+\S+\b/g,
  secret: /\b[Ss]ecret[:\s]+\S+\b/g,
  key: /\b[Kk]ey[:\s]+[A-Za-z0-9+/=_-]+\b/g,
  apiKey: /\b[Aa]pi[_-]?[Kk]ey[:\s]+[A-Za-z0-9+/=_-]+\b/g
};

const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'refreshToken',
  'privateKey',
  'sessionId',
  'session_id',
  'creditCard',
  'ssn',
  'social_security',
  'paymentInfo',
  'billing',
  'personalInfo'
];

export class CVPlusLogFormatter implements LogFormatter {
  private enablePIIRedaction: boolean;
  private customSensitiveFields: string[];

  constructor(options: {
    enablePIIRedaction?: boolean;
    customSensitiveFields?: string[];
  } = {}) {
    this.enablePIIRedaction = options.enablePIIRedaction ?? true;
    this.customSensitiveFields = options.customSensitiveFields || [];
  }

  /**
   * Format complete log entry
    */
  format(entry: LogEntry): string {
    const formattedEntry = {
      timestamp: new Date(entry.timestamp).toISOString(),
      level: entry.level.toUpperCase(),
      domain: entry.domain,
      service: entry.service || 'unknown',
      package: entry.package || '@cvplus/logging',
      message: entry.message,
      correlationId: entry.correlationId,
      context: this.enablePIIRedaction ? this.redactPII(entry.context) : entry.context,
      error: entry.error ? this.formatError(entry.error) : undefined,
      performance: entry.performance ? this.formatPerformance(entry.performance) : undefined,
      source: entry.source
    };

    // Remove undefined fields for cleaner output
    Object.keys(formattedEntry).forEach(key => {
      if (formattedEntry[key as keyof typeof formattedEntry] === undefined) {
        delete formattedEntry[key as keyof typeof formattedEntry];
      }
    });

    return JSON.stringify(formattedEntry, null, 2);
  }

  /**
   * Format error information with proper structure
    */
  formatError(error: ErrorInfo): string {
    const formatted: ErrorInfo = {
      message: error.message,
      name: error.name || 'Error',
      code: error.code
    };

    // Include stack trace in development/debug environments
    if (error.stack && (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug')) {
      formatted.stack = this.sanitizeStackTrace(error.stack);
    }

    // Include component stack for React errors
    if (error.componentStack) {
      formatted.componentStack = this.sanitizeStackTrace(error.componentStack);
    }

    // Include additional details with PII redaction
    if (error.details) {
      formatted.details = this.enablePIIRedaction ? this.redactPII(error.details) : error.details;
    }

    return JSON.stringify(formatted);
  }

  /**
   * Format performance information
    */
  formatPerformance(perf: PerformanceInfo): string {
    const formatted: PerformanceInfo = {};

    if (perf.duration !== undefined) {
      formatted.duration = Math.round(perf.duration * 100) / 100; // Round to 2 decimal places
    }

    if (perf.value !== undefined) {
      formatted.value = Math.round(perf.value * 100) / 100;
    }

    if (perf.requestSize !== undefined) {
      formatted.requestSize = perf.requestSize;
    }

    if (perf.responseSize !== undefined) {
      formatted.responseSize = perf.responseSize;
    }

    if (perf.additionalMetrics) {
      formatted.additionalMetrics = Object.keys(perf.additionalMetrics).reduce((acc, key) => {
        acc[key] = Math.round(perf.additionalMetrics![key] * 100) / 100;
        return acc;
      }, {} as Record<string, number>);
    }

    return JSON.stringify(formatted);
  }

  /**
   * Redact PII from data structures
    */
  redactPII(data: any): any {
    if (!this.enablePIIRedaction || data === null || data === undefined) {
      return data;
    }

    // Handle different data types
    if (typeof data === 'string') {
      return this.redactStringPII(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.redactPII(item));
    }

    if (typeof data === 'object') {
      return this.redactObjectPII(data);
    }

    return data;
  }

  /**
   * Redact PII from string content
    */
  private redactStringPII(str: string): string {
    let redacted = str;

    // Apply all sensitive patterns
    Object.entries(SENSITIVE_PATTERNS).forEach(([type, pattern]) => {
      redacted = redacted.replace(pattern, `[${type.toUpperCase()}_REDACTED]`);
    });

    return redacted;
  }

  /**
   * Redact PII from object properties
    */
  private redactObjectPII(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    const allSensitiveFields = [...SENSITIVE_FIELDS, ...this.customSensitiveFields];

    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();

      // Check if field name indicates sensitive data
      const isSensitiveField = allSensitiveFields.some(sensitiveField =>
        lowerKey.includes(sensitiveField.toLowerCase())
      );

      if (isSensitiveField) {
        result[key] = '[PII_REDACTED]';
      } else if (key === 'email') {
        result[key] = '[EMAIL_REDACTED]';
      } else if (key === 'ipAddress' || key === 'ip') {
        result[key] = this.redactIPAddress(obj[key]);
      } else if (key === 'userAgent') {
        result[key] = this.redactUserAgent(obj[key]);
      } else {
        // Recursively process nested objects/arrays
        result[key] = this.redactPII(obj[key]);
      }
    });

    return result;
  }

  /**
   * Redact IP address (keep first 3 octets for IPv4, first 4 groups for IPv6)
    */
  private redactIPAddress(ip: string): string {
    if (!ip || typeof ip !== 'string') return ip;

    // IPv4 pattern
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }

    // IPv6 pattern (simplified)
    if (ip.includes(':')) {
      const parts = ip.split(':');
      if (parts.length >= 4) {
        return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}::xxxx`;
      }
    }

    return '[IP_REDACTED]';
  }

  /**
   * Redact user agent (keep browser/platform info, remove specific versions)
    */
  private redactUserAgent(userAgent: string): string {
    if (!userAgent || typeof userAgent !== 'string') return userAgent;

    // Extract basic browser and platform info
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i);
    const platformMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/i);

    if (browserMatch && platformMatch) {
      return `${browserMatch[0]} on ${platformMatch[0]}`;
    } else if (browserMatch) {
      return browserMatch[0];
    } else if (platformMatch) {
      return `Browser on ${platformMatch[0]}`;
    }

    return '[USER_AGENT_REDACTED]';
  }

  /**
   * Sanitize stack traces to remove potential file path information
    */
  private sanitizeStackTrace(stack: string): string {
    return stack
      .split('\n')
      .map(line => {
        // Remove absolute file paths, keep relative paths and line numbers
        return line.replace(/\s+at\s+.*?([^/\\]+\.[^:]+:\d+:\d+)/, '    at $1');
      })
      .join('\n');
  }

  /**
   * Create a simple text formatter for console output
    */
  formatSimple(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const service = entry.service ? `[${entry.service}]` : '';
    const correlation = entry.correlationId ? `{${entry.correlationId.slice(0, 8)}}` : '';

    let message = `${timestamp} ${level} ${service}${correlation} ${entry.message}`;

    // Add context if present
    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = JSON.stringify(this.enablePIIRedaction ? this.redactPII(entry.context) : entry.context);
      message += ` - ${contextStr}`;
    }

    // Add error info if present
    if (entry.error) {
      message += ` - ERROR: ${entry.error.message}`;
      if (entry.error.code) {
        message += ` (${entry.error.code})`;
      }
    }

    return message;
  }

  /**
   * Create a detailed formatter with color coding (for development)
    */
  formatDetailed(entry: LogEntry): string {
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[32m',  // Green
      debug: '\x1b[36m', // Cyan
      fatal: '\x1b[35m', // Magenta
      reset: '\x1b[0m'
    };

    const color = colors[entry.level] || colors.reset;
    const timestamp = new Date(entry.timestamp).toISOString();
    const formatted = this.formatSimple(entry);

    return `${color}${formatted}${colors.reset}`;
  }
}

// Export default formatter instance
export const defaultFormatter = new CVPlusLogFormatter();

// Factory function for creating formatters with custom options
export function createFormatter(options: {
  enablePIIRedaction?: boolean;
  customSensitiveFields?: string[];
} = {}): CVPlusLogFormatter {
  return new CVPlusLogFormatter(options);
}