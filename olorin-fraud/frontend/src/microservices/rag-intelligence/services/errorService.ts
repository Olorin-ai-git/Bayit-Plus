import { ApiError } from './apiService';

// Error types specific to RAG operations
export type RAGErrorType =
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'not_found'
  | 'rate_limit'
  | 'quota_exceeded'
  | 'embedding_failed'
  | 'vector_search_failed'
  | 'document_processing_failed'
  | 'knowledge_base_error'
  | 'generation_failed'
  | 'model_unavailable'
  | 'timeout'
  | 'network'
  | 'server_error'
  | 'unknown';

// Enhanced RAG error interface
export interface RAGError extends Error {
  type: RAGErrorType;
  code?: string;
  status?: number;
  details?: any;
  requestId?: string;
  timestamp: string;
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
  suggestions?: string[];
  context?: Record<string, any>;
}

// Error classification rules
const ERROR_CLASSIFICATION: Record<number, RAGErrorType> = {
  400: 'validation',
  401: 'authentication',
  403: 'authorization',
  404: 'not_found',
  408: 'timeout',
  422: 'validation',
  429: 'rate_limit',
  500: 'server_error',
  502: 'server_error',
  503: 'server_error',
  504: 'timeout'
};

// User-friendly error messages
const USER_MESSAGES: Record<RAGErrorType, string> = {
  authentication: 'Please log in to continue using RAG Intelligence features.',
  authorization: 'You don\'t have permission to access this resource.',
  validation: 'The provided information is invalid. Please check and try again.',
  not_found: 'The requested resource could not be found.',
  rate_limit: 'Too many requests. Please wait a moment and try again.',
  quota_exceeded: 'Usage quota exceeded. Please contact your administrator.',
  embedding_failed: 'Failed to generate embeddings for your content.',
  vector_search_failed: 'Vector search operation failed. Please try again.',
  document_processing_failed: 'Failed to process the document. Please check the file format.',
  knowledge_base_error: 'Knowledge base operation failed. Please try again.',
  generation_failed: 'Failed to generate response. Please try again.',
  model_unavailable: 'AI model is temporarily unavailable. Please try again later.',
  timeout: 'Operation timed out. Please try again.',
  network: 'Network connection error. Please check your connection.',
  server_error: 'Server error occurred. Please try again later.',
  unknown: 'An unexpected error occurred. Please try again.'
};

// Recovery suggestions
const SUGGESTIONS: Record<RAGErrorType, string[]> = {
  authentication: [
    'Log in to your account',
    'Check if your session has expired',
    'Contact support if login issues persist'
  ],
  authorization: [
    'Request access from your administrator',
    'Check if you have the correct permissions',
    'Try using a different account'
  ],
  validation: [
    'Check all required fields are filled',
    'Verify data format requirements',
    'Review error details for specific issues'
  ],
  not_found: [
    'Check if the resource still exists',
    'Verify the correct ID or path',
    'Try refreshing the page'
  ],
  rate_limit: [
    'Wait a few minutes before trying again',
    'Reduce request frequency',
    'Contact support for higher limits'
  ],
  quota_exceeded: [
    'Contact your administrator',
    'Upgrade your plan',
    'Wait for quota reset'
  ],
  embedding_failed: [
    'Check document content and format',
    'Try with a smaller document',
    'Contact support if issue persists'
  ],
  vector_search_failed: [
    'Try with different search terms',
    'Check if vector index is built',
    'Verify knowledge base is active'
  ],
  document_processing_failed: [
    'Check file format is supported',
    'Ensure file is not corrupted',
    'Try with a smaller file',
    'Remove special characters from filename'
  ],
  knowledge_base_error: [
    'Check knowledge base status',
    'Verify you have access',
    'Try refreshing the page'
  ],
  generation_failed: [
    'Try simplifying your question',
    'Check if knowledge base has relevant content',
    'Try again in a moment'
  ],
  model_unavailable: [
    'Wait a few minutes and try again',
    'Check service status',
    'Contact support if issue persists'
  ],
  timeout: [
    'Try again with a simpler request',
    'Check your network connection',
    'Break down complex operations'
  ],
  network: [
    'Check your internet connection',
    'Try refreshing the page',
    'Wait and try again'
  ],
  server_error: [
    'Try again in a few minutes',
    'Check service status',
    'Contact support if issue persists'
  ],
  unknown: [
    'Try refreshing the page',
    'Try the operation again',
    'Contact support with error details'
  ]
};

// Retryable error types
const RETRYABLE_ERRORS: Set<RAGErrorType> = new Set([
  'timeout',
  'network',
  'server_error',
  'rate_limit',
  'model_unavailable'
]);

// Error service class
export class RAGErrorService {
  private static errorLog: RAGError[] = [];
  private static errorHandlers: Record<RAGErrorType, ((error: RAGError) => void)[]> = {};

  // Create RAG error from API error
  static createRAGError(apiError: ApiError, context?: Record<string, any>): RAGError {
    const type = this.classifyError(apiError);
    const userMessage = this.getUserMessage(type, apiError);
    const suggestions = this.getSuggestions(type);

    const ragError: RAGError = {
      name: 'RAGError',
      type,
      code: (apiError.details as any)?.code || `RAG_${type.toUpperCase()}`,
      status: apiError.status,
      message: apiError.message,
      details: apiError.details,
      requestId: apiError.requestId,
      timestamp: apiError.timestamp,
      retryable: RETRYABLE_ERRORS.has(type),
      userMessage,
      technicalMessage: apiError.message,
      suggestions,
      context: context || {},
      stack: new Error().stack
    };

    // Log error
    this.logError(ragError);

    return ragError;
  }

  // Create RAG error from generic error
  static createFromError(error: Error, type: RAGErrorType = 'unknown', context?: Record<string, any>): RAGError {
    const ragError: RAGError = {
      name: 'RAGError',
      type,
      message: error.message,
      timestamp: new Date().toISOString(),
      retryable: RETRYABLE_ERRORS.has(type),
      userMessage: USER_MESSAGES[type],
      technicalMessage: error.message,
      suggestions: SUGGESTIONS[type],
      context: context || {},
      stack: error.stack
    };

    this.logError(ragError);

    return ragError;
  }

  // Classify error type based on API error
  private static classifyError(apiError: ApiError): RAGErrorType {
    // Check specific error codes or messages first
    const details = apiError.details as any;
    const message = apiError.message.toLowerCase();

    if (details?.code) {
      switch (details.code) {
        case 'EMBEDDING_FAILED':
          return 'embedding_failed';
        case 'VECTOR_SEARCH_FAILED':
          return 'vector_search_failed';
        case 'DOCUMENT_PROCESSING_FAILED':
          return 'document_processing_failed';
        case 'GENERATION_FAILED':
          return 'generation_failed';
        case 'MODEL_UNAVAILABLE':
          return 'model_unavailable';
        case 'QUOTA_EXCEEDED':
          return 'quota_exceeded';
      }
    }

    // Check message content
    if (message.includes('embedding')) return 'embedding_failed';
    if (message.includes('vector')) return 'vector_search_failed';
    if (message.includes('document')) return 'document_processing_failed';
    if (message.includes('knowledge base')) return 'knowledge_base_error';
    if (message.includes('generation') || message.includes('generate')) return 'generation_failed';
    if (message.includes('model')) return 'model_unavailable';
    if (message.includes('quota') || message.includes('limit exceeded')) return 'quota_exceeded';
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('network')) return 'network';

    // Fall back to HTTP status code classification
    if (apiError.status && ERROR_CLASSIFICATION[apiError.status]) {
      return ERROR_CLASSIFICATION[apiError.status];
    }

    return 'unknown';
  }

  // Get user-friendly message
  private static getUserMessage(type: RAGErrorType, apiError?: ApiError): string {
    const baseMessage = USER_MESSAGES[type];

    // Add specific details for certain error types
    if (type === 'validation' && apiError?.details) {
      const validationErrors = (apiError.details as any)?.validation_errors;
      if (validationErrors && Array.isArray(validationErrors)) {
        return `${baseMessage} Issues: ${validationErrors.join(', ')}`;
      }
    }

    return baseMessage;
  }

  // Get recovery suggestions
  private static getSuggestions(type: RAGErrorType): string[] {
    return SUGGESTIONS[type] || SUGGESTIONS.unknown;
  }

  // Log error
  private static logError(error: RAGError): void {
    this.errorLog.push(error);

    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }

    // Console logging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('RAG Error:', {
        type: error.type,
        message: error.message,
        userMessage: error.userMessage,
        details: error.details,
        context: error.context,
        stack: error.stack
      });
    }

    // Trigger registered handlers
    const handlers = this.errorHandlers[error.type] || [];
    handlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error handler failed:', e);
      }
    });
  }

  // Register error handler
  static onError(type: RAGErrorType, handler: (error: RAGError) => void): () => void {
    if (!this.errorHandlers[type]) {
      this.errorHandlers[type] = [];
    }
    this.errorHandlers[type].push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.errorHandlers[type];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  // Get error log
  static getErrorLog(): RAGError[] {
    return [...this.errorLog];
  }

  // Get error statistics
  static getErrorStats(): Record<RAGErrorType, number> {
    const stats: Record<RAGErrorType, number> = {} as any;

    Object.values(USER_MESSAGES).forEach((_, index) => {
      const type = Object.keys(USER_MESSAGES)[index] as RAGErrorType;
      stats[type] = 0;
    });

    this.errorLog.forEach(error => {
      stats[error.type] = (stats[error.type] || 0) + 1;
    });

    return stats;
  }

  // Clear error log
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  // Check if error is retryable
  static isRetryable(error: RAGError): boolean {
    return error.retryable;
  }

  // Get retry delay for retryable errors
  static getRetryDelay(error: RAGError, attempt: number): number {
    if (!this.isRetryable(error)) return 0;

    // Base delays by error type (in milliseconds)
    const baseDelays: Record<RAGErrorType, number> = {
      timeout: 2000,
      network: 1000,
      server_error: 5000,
      rate_limit: 10000,
      model_unavailable: 15000,
      // Default for other types
      authentication: 0,
      authorization: 0,
      validation: 0,
      not_found: 0,
      quota_exceeded: 0,
      embedding_failed: 0,
      vector_search_failed: 0,
      document_processing_failed: 0,
      knowledge_base_error: 0,
      generation_failed: 0,
      unknown: 0
    };

    const baseDelay = baseDelays[error.type] || 1000;

    // Exponential backoff with jitter
    const delay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * delay; // 10% jitter

    return Math.min(delay + jitter, 60000); // Max 60 seconds
  }
}

// Error boundary helper for React components
export const handleRAGError = (error: Error | ApiError, context?: Record<string, any>): RAGError => {
  if ('status' in error && 'originalError' in error) {
    // It's an ApiError
    return RAGErrorService.createRAGError(error as ApiError, context);
  } else {
    // It's a generic Error
    return RAGErrorService.createFromError(error as Error, 'unknown', context);
  }
};

// Async error wrapper
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    throw handleRAGError(error as Error, context);
  }
};

// Export types and utilities
