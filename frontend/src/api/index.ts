/**
 * API Module
 *
 * Centralized exports for all API functionality.
 *
 * Constitutional Compliance:
 * - Configuration-driven API client
 * - Type-safe requests and responses
 * - Comprehensive error handling
 * - Runtime validation
 *
 * Usage:
 *   import { getApiClient, ValidationError, isApiSuccess } from '@api';
 */

export * from './config';
export * from './client';
export * from './errors';
export * from './types';
export * from './transformers';
export * from './query';
export * from './pagination';
export * from './cache';
export * from './interceptors';
export * from './websocket';
export * from './events';
export * from './testing';
export * from './schemas';
export * from './hooks';
export * from './performance';
export * from './services';
export * from './integration';
export * from './resilience';

// Export everything from these modules except the conflicting names
export * from './realtime';
export * from './monitoring';
export * from './utils';

// Explicit re-exports with aliases to resolve conflicts
export { LogEntry as RealtimeLogEntry } from './realtime/hooks';
export { LogEntry as MonitoringLogEntry } from './monitoring/logger';
export { formatErrorMessage as formatApiErrorMessage } from './errors';
export { formatErrorMessage as formatUtilsErrorMessage } from './utils/format';
