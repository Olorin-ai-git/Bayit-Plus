/**
 * Reporting Service Adapter
 * Feature: Report generation, export, and download
 */

import { BaseServiceAdapter } from '../base/BaseServiceAdapter';

/**
 * Reporting Service Adapter
 * Handles report generation, export operations, and completion notifications
 */
export class ReportingAdapter extends BaseServiceAdapter {
  constructor() {
    super('reporting');
  }

  protected initialize(): void {
    this.subscribeToEvent('report:generated', (data) => {
      this.sendMessage('report-generated', data);
    });

    this.subscribeToEvent('report:export:started', (data) => {
      this.sendMessage('export-started', data);
    });

    this.subscribeToEvent('report:export:completed', (data) => {
      this.sendMessage('export-completed', data);
      this.emitEvent('ui:notification:show', {
        notification: {
          id: `export-${Date.now()}`,
          type: 'success',
          title: 'Export Complete',
          message: `Report export is ready for download`,
          duration: 5000
        }
      });
    });
  }

  /** Generate report */
  public generateReport(reportId: string, type: string, url: string): void {
    this.emitEvent('report:generated', { reportId, type, url });
  }

  /** Start export */
  public startExport(reportId: string, format: string): void {
    this.emitEvent('report:export:started', { reportId, format });
  }

  /** Complete export */
  public completeExport(reportId: string, downloadUrl: string): void {
    this.emitEvent('report:export:completed', { reportId, downloadUrl });
  }
}
