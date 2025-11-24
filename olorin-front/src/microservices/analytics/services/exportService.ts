/**
 * Export Service for analytics data export.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { analyticsService } from './analyticsService';
import type { ExportOptions } from '../types/analytics';

export class ExportService {
  async exportCSV(options: ExportOptions): Promise<Blob> {
    return analyticsService.exportData({ ...options, format: 'csv' });
  }

  async exportJSON(options: ExportOptions): Promise<Blob> {
    return analyticsService.exportData({ ...options, format: 'json' });
  }

  async exportPDF(options: ExportOptions): Promise<Blob> {
    return analyticsService.exportData({ ...options, format: 'pdf' });
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

export const exportService = new ExportService();

