/**
 * T019: Correlation ID service in packages/core/src/logging/CorrelationService.ts
 *
 * Manages correlation IDs for tracking requests across multiple services and packages
 * Uses Node.js AsyncLocalStorage for context management in async operations
  */

import { AsyncLocalStorage } from 'async_hooks';
import { nanoid } from 'nanoid';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '@cvplus/core';

interface CorrelationContext {
  correlationId: string;
  parentId?: string;
  startTime: number;
}

/**
 * Service for managing correlation IDs across async operations
  */
export class CorrelationService {
  private static asyncLocalStorage = new AsyncLocalStorage<CorrelationContext>();

  /**
   * Generate a new unique correlation ID
    */
  static generateId(prefix?: string): string {
    const id = nanoid(12); // 12 character nanoid for good uniqueness and readability
    return prefix ? `${prefix}-${id}` : id;
  }

  /**
   * Set the current correlation ID for the async context
    */
  static setCurrentId(correlationId: string): void {
    const currentContext = this.asyncLocalStorage.getStore();
    const newContext: CorrelationContext = {
      correlationId,
      parentId: currentContext?.correlationId,
      startTime: Date.now()
    };

    this.asyncLocalStorage.enterWith(newContext);
  }

  /**
   * Get the current correlation ID from async context
    */
  static getCurrentId(): string | null {
    const context = this.asyncLocalStorage.getStore();
    return context?.correlationId || null;
  }

  /**
   * Get the current correlation context (including parent and timing info)
    */
  static getCurrentContext(): CorrelationContext | null {
    return this.asyncLocalStorage.getStore() || null;
  }

  /**
   * Execute a function with a specific correlation ID
    */
  static withCorrelationId<T>(
    correlationId: string,
    callback: () => T | Promise<T>
  ): T | Promise<T> {
    const currentContext = this.asyncLocalStorage.getStore();
    const newContext: CorrelationContext = {
      correlationId,
      parentId: currentContext?.correlationId,
      startTime: Date.now()
    };

    return this.asyncLocalStorage.run(newContext, callback);
  }

  /**
   * Execute a function with a new generated correlation ID
    */
  static withNewCorrelationId<T>(
    callback: () => T | Promise<T>,
    prefix?: string
  ): T | Promise<T> {
    const correlationId = this.generateId(prefix);
    return this.withCorrelationId(correlationId, callback);
  }

  /**
   * Clear the current correlation context
    */
  static clear(): void {
    this.asyncLocalStorage.disable();
  }

  /**
   * Create Express middleware for automatic correlation ID handling
    */
  static middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Check for existing correlation ID in headers
      const existingId = req.headers['x-correlation-id'] as string ||
                        req.headers['x-request-id'] as string ||
                        req.headers['correlation-id'] as string;

      const correlationId = existingId || this.generateId('req');

      // Set response header
      res.setHeader('X-Correlation-ID', correlationId);

      // Add to request object for easy access
      (req as any).correlationId = correlationId;

      // Run the rest of the request in correlation context
      this.withCorrelationId(correlationId, () => {
        next();
      });
    };
  }

  /**
   * Create a child correlation ID for nested operations
    */
  static createChild(suffix?: string): string {
    const currentId = this.getCurrentId();
    if (!currentId) {
      return this.generateId(suffix);
    }

    const childId = suffix ? `${currentId}.${suffix}` : `${currentId}.${nanoid(6)}`;
    return childId;
  }

  /**
   * Get timing information for the current correlation context
    */
  static getElapsedTime(): number | null {
    const context = this.asyncLocalStorage.getStore();
    if (!context) {
      return null;
    }

    return Date.now() - context.startTime;
  }

  /**
   * Create a correlation chain for tracking nested operations
    */
  static createChain(): {
    parentId: string | null;
    currentId: string;
    depth: number;
  } {
    const context = this.asyncLocalStorage.getStore();
    const currentId = context?.correlationId || this.generateId();

    // Calculate depth by counting dots in the ID
    const depth = currentId.split('.').length - 1;

    return {
      parentId: context?.parentId || null,
      currentId,
      depth
    };
  }

  /**
   * Bind a function to preserve correlation context
    */
  static bind<Args extends any[], Return>(
    fn: (...args: Args) => Return
  ): (...args: Args) => Return {
    const context = this.asyncLocalStorage.getStore();

    return (...args: Args): Return => {
      if (context) {
        return this.asyncLocalStorage.run(context, () => fn(...args));
      }
      return fn(...args);
    };
  }

  /**
   * Bind a promise-returning function to preserve correlation context
    */
  static bindAsync<Args extends any[], Return>(
    fn: (...args: Args) => Promise<Return>
  ): (...args: Args) => Promise<Return> {
    const context = this.asyncLocalStorage.getStore();

    return async (...args: Args): Promise<Return> => {
      if (context) {
        return this.asyncLocalStorage.run(context, () => fn(...args));
      }
      return fn(...args);
    };
  }

  /**
   * Get a summary of the correlation chain for debugging
    */
  static getChainSummary(): {
    current: string | null;
    parent: string | null;
    elapsedTime: number | null;
    depth: number;
  } {
    const context = this.asyncLocalStorage.getStore();
    const chain = this.createChain();

    return {
      current: context?.correlationId || null,
      parent: context?.parentId || null,
      elapsedTime: this.getElapsedTime(),
      depth: chain.depth
    };
  }

  /**
   * Utility for debugging correlation context
    */
  static debug(): void {
    const summary = this.getChainSummary();
    logger.info('[CorrelationService Debug]', {
      ...summary,
      hasContext: !!this.asyncLocalStorage.getStore()
    });
  }
}