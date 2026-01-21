/**
 * Reporting Hooks - Legacy Export
 *
 * This file maintains backwards compatibility by re-exporting from the modular implementation.
 * All hooks have been refactored into focused modules under ./modules/
 *
 * @deprecated Import directly from './modules' for better tree-shaking and clarity
 * @see ./modules/index.ts for the primary export point
 */

// Re-export all hooks from the modular implementation
export {
  // Core Report Hooks
  useReport,
  useReports,

  // Template & Generation Hooks
  useReportTemplates,
  useReportGeneration,

  // Analytics & Sharing Hooks
  useReportAnalytics,
  useReportSharing,

  // Comments & Preview Hooks
  useReportComments,
  useReportPreview,

  // Data & Notifications Hooks
  useDataSources,
  useReportNotifications,

  // Real-time Updates Hook
  useReportUpdates
} from './modules';

// Re-export types for convenience
export type {
  Report,
  ReportTemplate,
  ReportGeneration,
  ReportAnalytics,
  ReportShare,
  ReportComment,
  ReportPreview,
  ReportDataSource,
  ReportNotification,
  ReportConfig
} from '../types/reporting';
