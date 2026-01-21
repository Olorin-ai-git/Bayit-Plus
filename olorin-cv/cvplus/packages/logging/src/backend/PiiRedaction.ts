/**
 * T020: PII redaction utility in packages/core/src/logging/PiiRedaction.ts
 *
 * Automatically detects and redacts personally identifiable information (PII)
 * from log entries to ensure GDPR and privacy compliance
  */

import { LogEntry, PiiRedactionConfig } from './types';

/**
 * Default PII patterns for automatic detection and redaction
  */
const DEFAULT_PII_PATTERNS: Record<string, RegExp> = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers (various formats) - made more specific
  phone: /(?:\+1[-.\s]?)?(?:\(?[2-9]\d{2}\)?[-.\s]?)[2-9]\d{2}[-.\s]?\d{4}\b/g,

  // Credit card numbers (basic pattern)
  creditCard: /\b(?:4\d{12}(?:\d{3})?|5[1-5]\d{14}|3[47]\d{13}|3[0-9]\d{11}|6(?:011|5\d{2})\d{12})\b/g,

  // Social Security Numbers
  ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,

  // IP Addresses (IPv4 and IPv6)
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  ipv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,

  // API Keys and Tokens (common patterns)
  apiKey: /\b[A-Za-z0-9]{20,}\b/g,

  // JWT Tokens
  jwt: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/g,

  // URLs with potential sensitive data
  urlWithQuery: /https?:\/\/[^\s]+\?[^\s]*/g,

  // Passwords in common formats
  password: /(?:password|pwd|pass)['"\s]*[:=]['"\s]*[^\s'"]+/gi,

  // Authorization headers
  authorization: /(?:authorization|auth)['"\s]*[:=]['"\s]*[^\s'"]+/gi
};

/**
 * Redaction replacement functions
  */
const REDACTION_REPLACEMENTS: Record<string, (match: string) => string> = {
  email: () => '[EMAIL_REDACTED]',
  phone: () => '[PHONE_REDACTED]',
  creditCard: () => '[CARD_REDACTED]',
  ssn: () => '[SSN_REDACTED]',
  ipv4: () => '[IP_REDACTED]',
  ipv6: () => '[IP_REDACTED]',
  apiKey: () => '[API_KEY_REDACTED]',
  jwt: () => '[JWT_TOKEN_REDACTED]',
  urlWithQuery: (match) => {
    const url = new URL(match);
    return `${url.protocol}//${url.host}${url.pathname}?[QUERY_REDACTED]`;
  },
  password: () => '[PASSWORD_REDACTED]',
  authorization: () => '[AUTH_TOKEN_REDACTED]'
};

/**
 * PII Redaction service for protecting sensitive information in logs
  */
export class PiiRedaction {
  private static enabled: boolean = true;
  private static customPatterns: Record<string, RegExp> = {};
  private static customReplacements: Record<string, (match: string) => string> = {};

  /**
   * Check if PII redaction is currently enabled
    */
  static isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable PII redaction globally
    */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Add custom PII patterns for redaction
    */
  static addCustomPattern(
    name: string,
    pattern: RegExp,
    replacement?: (match: string) => string
  ): void {
    this.customPatterns[name] = pattern;
    if (replacement) {
      this.customReplacements[name] = replacement;
    } else {
      this.customReplacements[name] = () => `[${name.toUpperCase()}_REDACTED]`;
    }
  }

  /**
   * Remove a custom PII pattern
    */
  static removeCustomPattern(name: string): void {
    delete this.customPatterns[name];
    delete this.customReplacements[name];
  }

  /**
   * Redact PII from a string
    */
  static redactString(
    text: string,
    customPatterns?: Record<string, RegExp>
  ): string {
    if (!this.enabled || !text || typeof text !== 'string') {
      return text;
    }

    let redactedText = text;

    // Apply default patterns
    Object.entries(DEFAULT_PII_PATTERNS).forEach(([name, pattern]) => {
      const replacement = REDACTION_REPLACEMENTS[name] || (() => `[${name.toUpperCase()}_REDACTED]`);
      redactedText = redactedText.replace(pattern, replacement);
    });

    // Apply custom patterns from class
    Object.entries(this.customPatterns).forEach(([name, pattern]) => {
      const replacement = this.customReplacements[name];
      redactedText = redactedText.replace(pattern, replacement);
    });

    // Apply custom patterns from parameter
    if (customPatterns) {
      Object.entries(customPatterns).forEach(([name, pattern]) => {
        const replacement = () => `[${name.toUpperCase()}_REDACTED]`;
        redactedText = redactedText.replace(pattern, replacement);
      });
    }

    return redactedText;
  }

  /**
   * Recursively redact PII from an object
    */
  static redactObject<T>(obj: T): T {
    if (!this.enabled || obj === null || obj === undefined) {
      return obj;
    }

    // Handle primitive types
    if (typeof obj === 'string') {
      return this.redactString(obj) as T;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item)) as T;
    }

    // Handle objects
    const result = {} as T;
    Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof value === 'string') {
        (result as any)[key] = this.redactString(value);
      } else if (typeof value === 'object' && value !== null) {
        (result as any)[key] = this.redactObject(value);
      } else {
        (result as any)[key] = value;
      }
    });

    return result;
  }

  /**
   * Redact PII from a log entry
    */
  static redactLogEntry(logEntry: LogEntry): LogEntry {
    if (!this.enabled) {
      return logEntry;
    }

    return {
      ...logEntry,
      message: this.redactString(logEntry.message),
      context: this.redactObject(logEntry.context),
      error: logEntry.error ? {
        ...logEntry.error,
        message: this.redactString(logEntry.error.message),
        stack: logEntry.error.stack ? this.redactString(logEntry.error.stack) : undefined
      } : undefined
    };
  }

  /**
   * Create a redaction configuration for specific use cases
    */
  static createConfig(options: {
    enabled?: boolean;
    patterns?: Record<string, RegExp>;
    customReplacements?: Record<string, (match: string) => string>;
  }): PiiRedactionConfig {
    const patterns = {
      ...DEFAULT_PII_PATTERNS,
      ...options.patterns
    };

    const replacements = {
      ...REDACTION_REPLACEMENTS,
      ...options.customReplacements
    };

    return {
      enabled: options.enabled ?? true,
      patterns,
      replacement: (match: string, patternName: string) => {
        const replacer = replacements[patternName];
        return replacer ? replacer(match) : `[${patternName.toUpperCase()}_REDACTED]`;
      }
    };
  }

  /**
   * Validate that a string has been properly redacted
    */
  static validateRedaction(text: string): {
    isClean: boolean;
    violations: Array<{ type: string; match: string; position: number }>;
  } {
    const violations: Array<{ type: string; match: string; position: number }> = [];

    Object.entries(DEFAULT_PII_PATTERNS).forEach(([type, pattern]) => {
      let match;
      const regex = new RegExp(pattern);
      while ((match = regex.exec(text)) !== null) {
        violations.push({
          type,
          match: match[0],
          position: match.index
        });
      }
    });

    return {
      isClean: violations.length === 0,
      violations
    };
  }

  /**
   * Get statistics about redaction operations
    */
  static getRedactionStats(): {
    enabled: boolean;
    totalPatterns: number;
    customPatterns: number;
    patternNames: string[];
  } {
    const allPatterns = {
      ...DEFAULT_PII_PATTERNS,
      ...this.customPatterns
    };

    return {
      enabled: this.enabled,
      totalPatterns: Object.keys(allPatterns).length,
      customPatterns: Object.keys(this.customPatterns).length,
      patternNames: Object.keys(allPatterns)
    };
  }

  /**
   * Reset all custom patterns and settings
    */
  static reset(): void {
    this.customPatterns = {};
    this.customReplacements = {};
    this.enabled = true;
  }
}