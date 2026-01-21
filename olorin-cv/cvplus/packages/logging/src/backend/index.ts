/**
 * CVPlus Core Logging Module
 * Comprehensive logging system for CVPlus platform
 *
 * Exports:
 * - LoggerFactory: Create and manage logger instances
 * - CorrelationService: Track requests across services
 * - PiiRedaction: Automatically redact sensitive information
 * - LogFormatter: Format logs for different outputs
 * - FirebaseTransport: Custom Winston transport for Firebase Cloud Logging
 * - LogStream: Real-time log streaming and filtering
 * - AlertRule: Intelligent alerting system for log events
 * - AuditTrail: Compliance-focused audit logging
 * - LogArchive: Long-term log storage and archival
 * - Types: TypeScript interfaces and enums
  */

// Core services
import { LoggerFactory } from './LoggerFactory';
import { CorrelationService } from './CorrelationService';
export { LoggerFactory };
export { CorrelationService };
export { PiiRedaction } from './PiiRedaction';
export { LogFormatter } from './LogFormatter';

// Firebase integration
export { FirebaseTransport } from './FirebaseTransport';
export type { FirebaseTransportOptions } from './FirebaseTransport';

// Data models and systems
export { LogStream, LogStreamManager, globalStreamManager } from './LogStream';
export { AlertRule, AlertRuleManager, globalAlertManager } from './AlertRule';
export { AuditTrail, globalAuditTrail } from './AuditTrail';
export { LogArchive, globalLogArchive } from './LogArchive';

// Types and interfaces
export * from './types/index';

// Enums for data models
export { AlertConditionType } from './AlertRule';
export { AuditEventType } from './AuditTrail';
export { ArchiveStorageType, CompressionType } from './LogArchive';

// Package logger factory and implementations
import PackageLoggerFactoryDefault from './PackageLoggerFactory';
export { PackageLoggerFactoryDefault as PackageLoggerFactory };
export {
  BasePackageLogger,
  AnalyticsLogger,
  PremiumLogger,
  RecommendationsLogger,
  ProfilesLogger,
  AdminLogger,
  WorkflowLogger,
  PaymentsLogger,
  createPackageLogger,
  analyticsLogger,
  premiumLogger,
  recommendationsLogger,
  profilesLogger,
  adminLogger,
  workflowLogger,
  paymentsLogger,
  packageLogging
} from './PackageLoggerFactory';

// Note: All types are now exported via export * from './types/index';

/**
 * Quick start utility for creating a logger with sensible defaults
  */
export function createLogger(serviceName: string, level?: import('./types/index').LogLevel) {
  return LoggerFactory.createLogger(serviceName, { level });
}

/**
 * Express middleware for automatic correlation ID handling
  */
export const correlationMiddleware = CorrelationService.middleware();

/**
 * Default logger instance for immediate use
  */
export const logger = LoggerFactory.createLogger('@cvplus/core');

/**
 * Version information
  */
export const VERSION = '1.0.0';