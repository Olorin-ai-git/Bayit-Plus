/**
 * Utilities Index
 * Exports all utility functions and classes for the autonomous investigation microservice
 */

// Graph transformers
export {
  D3Transformer,
  ReactFlowTransformer,
  GraphOptimizer,
  type BaseGraphNode,
  type BaseGraphEdge,
  type D3Node,
  type D3Edge,
  type ReactFlowNode,
  type ReactFlowEdge,
  type LayoutAlgorithm,
  type LayoutConfig,
} from './graphTransformers';

// Cache management
export {
  CacheManager,
  InvestigationCacheManager,
  investigationCache,
  type CacheConfig,
  type CacheItem,
  type CacheStats,
} from './cacheManager';

// Error handling
export {
  ErrorHandler as default,
  ErrorClassifier,
  RetryHandler,
  CircuitBreaker,
  UserErrorMessages,
  ErrorLogger,
  ErrorType,
  ErrorSeverity,
  type AppError,
  type RetryConfig,
  type ErrorBoundaryState,
} from './errorHandler';

// Data validation
export {
  InvestigationValidator,
  EvidenceValidator,
  DomainValidator,
  TypeGuards,
  DataSanitizer,
  SchemaValidator,
  validateInvestigation,
  validateEvidence,
  validateDomain,
  isValidInvestigation,
  isValidEvidence,
  isValidDomain,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type ValidationRule,
} from './dataValidation';

// Performance monitoring
export {
  PerformanceMonitor,
  ComponentProfiler,
  performanceMonitor,
  startTimer,
  endTimer,
  recordMetric,
  recordUserAction,
  getPerformanceReport,
  type PerformanceMetric,
  type RenderMetric,
  type ApiMetric,
  type MemoryMetric,
  type UserMetric,
  type BusinessMetric,
  type PerformanceThresholds,
} from './performanceMonitor';

// Utility constants
export const CACHE_KEYS = {
  INVESTIGATION: (id: string) => `investigation:${id}`,
  EVIDENCE: (id: string) => `evidence:${id}`,
  DOMAINS: (id: string) => `domains:${id}`,
  GRAPH: (id: string, format: string) => `graph:${id}:${format}`,
  SEARCH: (query: string) => `search:${query}`,
} as const;

export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export const PERFORMANCE_CATEGORIES = {
  RENDER: 'render',
  API: 'api',
  MEMORY: 'memory',
  USER: 'user',
  BUSINESS: 'business',
} as const;

// Utility helper functions
export const utils = {
  /**
   * Debounce function execution
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate = false
  ): T => {
    let timeout: NodeJS.Timeout | null = null;

    return ((...args: Parameters<T>) => {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };

      const callNow = immediate && !timeout;

      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) func(...args);
    }) as T;
  },

  /**
   * Throttle function execution
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T => {
    let inThrottle = false;

    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    }) as T;
  },

  /**
   * Deep clone an object
   */
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => utils.deepClone(item)) as unknown as T;
    if (typeof obj === 'object') {
      const clonedObj = {} as T;
      Object.keys(obj).forEach(key => {
        (clonedObj as any)[key] = utils.deepClone((obj as any)[key]);
      });
      return clonedObj;
    }
    return obj;
  },

  /**
   * Format bytes to human readable string
   */
  formatBytes: (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  /**
   * Format duration to human readable string
   */
  formatDuration: (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  },

  /**
   * Generate a unique ID
   */
  generateId: (prefix = ''): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}${prefix ? '-' : ''}${timestamp}-${random}`;
  },

  /**
   * Check if object is empty
   */
  isEmpty: (obj: any): boolean => {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  },

  /**
   * Safe JSON parse with default value
   */
  safeJsonParse: <T>(str: string, defaultValue: T): T => {
    try {
      return JSON.parse(str);
    } catch {
      return defaultValue;
    }
  },

  /**
   * Get nested object value safely
   */
  get: (obj: any, path: string, defaultValue?: any): any => {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result == null || typeof result !== 'object') {
        return defaultValue;
      }
      result = result[key];
    }

    return result !== undefined ? result : defaultValue;
  },

  /**
   * Set nested object value safely
   */
  set: (obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (current[key] == null || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  },

  /**
   * Merge objects deeply
   */
  merge: <T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T => {
    if (!sources.length) return target;
    const source = sources.shift();

    if (utils.isObject(target) && utils.isObject(source)) {
      for (const key in source) {
        if (utils.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          utils.merge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return utils.merge(target, ...sources);
  },

  /**
   * Check if value is an object
   */
  isObject: (item: any): boolean => {
    return item && typeof item === 'object' && !Array.isArray(item);
  },

  /**
   * Create a promise that resolves after specified delay
   */
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry an async operation with exponential backoff
   */
  retryWithBackoff: async <T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        await utils.delay(delay);
      }
    }

    throw lastError!;
  },
};

// Export all utilities as a single object for convenience
export const investigationUtils = {
  cache: investigationCache,
  performance: performanceMonitor,
  validation: {
    validateInvestigation,
    validateEvidence,
    validateDomain,
    isValidInvestigation,
    isValidEvidence,
    isValidDomain,
  },
  transform: {
    D3Transformer,
    ReactFlowTransformer,
    GraphOptimizer,
  },
  error: {
    ErrorHandler,
    ErrorClassifier,
    RetryHandler,
    ErrorLogger,
  },
  ...utils,
};