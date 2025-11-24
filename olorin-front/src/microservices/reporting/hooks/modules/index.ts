/**
 * Reporting Hooks - Barrel Export
 * Central export point for all reporting hook modules
 *
 * @module reporting-hooks
 */

// Core Report Hooks
export { useReport } from './useReportCore';
export { useReports } from './useReportsList';

// Template & Generation Hooks
export { useReportTemplates, useReportGeneration } from './useReportTemplates';

// Analytics & Sharing Hooks
export { useReportAnalytics, useReportSharing } from './useReportAnalytics';

// Comments & Preview Hooks
export { useReportComments, useReportPreview } from './useReportComments';

// Data & Notifications Hooks
export { useDataSources, useReportNotifications } from './useReportData';

// Real-time Updates Hook
export { useReportUpdates } from './useReportRealtime';

// Re-export common types for convenience
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
} from '../../types/reporting';
