/**
 * T019: Correlation ID management utilities
 * CVPlus Logging System - Correlation Tracking
  */

import { nanoid } from 'nanoid';
import { CorrelationContext } from '../types/index';

// Simple correlation context storage (placeholder for cls-hooked)
// Note: Should use cls-hooked when dependency is available
const correlationStore = new Map<string, CorrelationContext>();
let currentCorrelationKey = 'default';

// Correlation context storage
export class CorrelationManager {
  private static instance: CorrelationManager;

  constructor() {
    // Simplified implementation without cls-hooked
  }

  static getInstance(): CorrelationManager {
    if (!CorrelationManager.instance) {
      CorrelationManager.instance = new CorrelationManager();
    }
    return CorrelationManager.instance;
  }

  /**
   * Generate a new correlation ID using nanoid
    */
  generateCorrelationId(): string {
    return nanoid(21); // 21 characters for good uniqueness without being too long
  }

  /**
   * Set correlation context for the current execution flow
    */
  setCorrelationContext(context: CorrelationContext): void {
    correlationStore.set(currentCorrelationKey, context);
  }

  /**
   * Get current correlation context
    */
  getCorrelationContext(): CorrelationContext | null {
    return correlationStore.get(currentCorrelationKey) || null;
  }

  /**
   * Get current correlation ID
    */
  getCurrentCorrelationId(): string | null {
    const context = this.getCorrelationContext();
    return context?.correlationId || null;
  }

  /**
   * Execute callback with specific correlation context
    */
  withCorrelation<T>(correlationId: string, callback: () => T): T {
    const existingContext = this.getCorrelationContext() || {};
    this.setCorrelationContext({
      ...existingContext,
      correlationId
    });
    return callback();
  }

  /**
   * Execute callback with new correlation context
    */
  withNewCorrelation<T>(callback: (correlationId: string) => T): T {
    const correlationId = this.generateCorrelationId();
    return this.withCorrelation(correlationId, () => callback(correlationId));
  }

  /**
   * Add user context to current correlation
    */
  addUserContext(userId: string, sessionId?: string): void {
    const context = this.getCorrelationContext();
    this.setCorrelationContext({
      correlationId: context?.correlationId || this.generateCorrelationId(),
      ...context,
      userId,
      sessionId
    });
  }

  /**
   * Add request context to current correlation
    */
  addRequestContext(requestId: string, traceId?: string): void {
    const context = this.getCorrelationContext();
    this.setCorrelationContext({
      correlationId: context?.correlationId || this.generateCorrelationId(),
      ...context,
      requestId,
      traceId
    });
  }

  /**
   * Create child correlation from parent
    */
  createChildCorrelation(parentCorrelationId?: string): string {
    const childCorrelationId = this.generateCorrelationId();
    const existingContext = this.getCorrelationContext();

    this.setCorrelationContext({
      ...existingContext,
      correlationId: childCorrelationId,
      parentId: parentCorrelationId || existingContext?.correlationId
    });

    return childCorrelationId;
  }

  /**
   * Clear correlation context
    */
  clearCorrelation(): void {
    correlationStore.delete(currentCorrelationKey);
  }

  /**
   * Check if correlation tracking is active
    */
  isCorrelationActive(): boolean {
    return this.getCurrentCorrelationId() !== null;
  }

  /**
   * Get correlation chain information
    */
  getCorrelationChain(): {
    correlationId: string;
    parentId?: string;
    depth: number;
  } | null {
    const context = this.getCorrelationContext();
    if (!context?.correlationId) return null;

    // Calculate depth by counting parent relationships
    let depth = 0;
    let currentContext = context;
    while (currentContext?.parentId) {
      depth++;
      // In a real implementation, we might look up parent contexts
      // For now, we just increment once and break to avoid infinite loops
      break;
    }

    return {
      correlationId: context.correlationId,
      parentId: context.parentId,
      depth
    };
  }

  /**
   * Extract correlation ID from various sources (headers, context, etc.)
    */
  extractCorrelationId(sources: {
    headers?: Record<string, string | string[] | undefined>;
    context?: Record<string, any>;
    query?: Record<string, any>;
  }): string | null {
    const { headers = {}, context = {}, query = {} } = sources;

    // Check common correlation header names
    const correlationHeaders = [
      'x-correlation-id',
      'x-request-id',
      'x-trace-id',
      'correlation-id',
      'request-id'
    ];

    for (const headerName of correlationHeaders) {
      const headerValue = headers[headerName];
      if (headerValue && typeof headerValue === 'string') {
        return headerValue;
      }
    }

    // Check context and query parameters
    return context.correlationId ||
           context.requestId ||
           query.correlationId ||
           query.requestId ||
           null;
  }

  /**
   * Validate correlation ID format
    */
  isValidCorrelationId(correlationId: string): boolean {
    // nanoid generates URL-safe characters: A-Za-z0-9_-
    // Standard length is 21 characters
    return /^[A-Za-z0-9_-]{10,50}$/.test(correlationId);
  }

  /**
   * Sanitize correlation ID to ensure it's safe for logging
    */
  sanitizeCorrelationId(correlationId: string): string | null {
    if (!correlationId || typeof correlationId !== 'string') {
      return null;
    }

    const trimmed = correlationId.trim();
    return this.isValidCorrelationId(trimmed) ? trimmed : null;
  }
}

// Export singleton instance
export const correlationManager = CorrelationManager.getInstance();

// Convenience functions for common operations
export function generateCorrelationId(): string {
  return correlationManager.generateCorrelationId();
}

export function getCurrentCorrelationId(): string | null {
  return correlationManager.getCurrentCorrelationId();
}

export function withCorrelation<T>(correlationId: string, callback: () => T): T {
  return correlationManager.withCorrelation(correlationId, callback);
}

export function withNewCorrelation<T>(callback: (correlationId: string) => T): T {
  return correlationManager.withNewCorrelation(callback);
}

export function extractCorrelationId(sources: {
  headers?: Record<string, string | string[] | undefined>;
  context?: Record<string, any>;
  query?: Record<string, any>;
}): string | null {
  return correlationManager.extractCorrelationId(sources);
}

// Express middleware helper for correlation tracking
export function correlationMiddleware() {
  return (req: any, res: any, next: any) => {
    const correlationId = extractCorrelationId({
      headers: req.headers,
      query: req.query
    }) || generateCorrelationId();

    correlationManager.withCorrelation(correlationId, () => {
      // Add correlation ID to response headers
      res.setHeader('X-Correlation-ID', correlationId);

      // Store in request for downstream use
      req.correlationId = correlationId;

      next();
    });
  };
}