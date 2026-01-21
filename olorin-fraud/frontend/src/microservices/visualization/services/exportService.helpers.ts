/**
 * Export Service Helper Functions
 *
 * Helper functions for export service.
 * Extracted for better modularity and file size compliance.
 */

import { visualizationConfig } from '../config/environment';

/**
 * Export formats
 */
export type ExportFormat = 'png' | 'svg' | 'json';

/**
 * Export options interface
 */
export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  quality?: number;
  includeTimestamp?: boolean;
  includeMetadata?: boolean;
}

/**
 * Export metadata interface
 */
export interface ExportMetadata {
  timestamp: string;
  service: string;
  version: string;
  exportFormat: ExportFormat;
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(
  customFilename: string | undefined,
  format: ExportFormat,
  includeTimestamp: boolean = true
): string {
  const config = visualizationConfig?.export || {};
  const prefix = config.filenamePrefix || 'olorin-visualization';
  const timestamp = includeTimestamp ? `-${new Date().toISOString().replace(/[:.]/g, '-')}` : '';
  const base = customFilename || prefix;

  return `${base}${timestamp}.${format}`;
}

/**
 * Generate export metadata
 */
export function generateMetadata(format: ExportFormat): ExportMetadata {
  return {
    timestamp: new Date().toISOString(),
    service: 'visualization-microservice',
    version: '1.0.0',
    exportFormat: format
  };
}

/**
 * Trigger file download
 */
export function downloadFile(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
