import { useState, useCallback } from 'react';
import { Investigation } from '../types/investigation';
import { ExportOptions } from '../components/ExportReporting';
import { exportService, ExportResult } from '../services/exportService';

export interface ExportState {
  isExporting: boolean;
  lastExport: ExportResult | null;
  error: string | null;
}

export interface UseExportReportingReturn {
  exportState: ExportState;
  exportInvestigation: (investigation: Investigation, options: ExportOptions) => Promise<void>;
  clearError: () => void;
  getExportHistory: () => ExportHistoryItem[];
  scheduleExport: (investigation: Investigation, options: ExportOptions, scheduleTime: Date) => Promise<void>;
}

export interface ExportHistoryItem {
  id: string;
  investigationId: string;
  investigationTitle: string;
  timestamp: string;
  format: string;
  template: string;
  status: 'completed' | 'failed' | 'scheduled';
  filename?: string;
  downloadUrl?: string;
  error?: string;
}

export const useExportReporting = (): UseExportReportingReturn => {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    lastExport: null,
    error: null
  });

  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('olorin-export-history');
    return saved ? JSON.parse(saved) : [];
  });

  const saveHistoryToStorage = useCallback((history: ExportHistoryItem[]) => {
    localStorage.setItem('olorin-export-history', JSON.stringify(history));
  }, []);

  const exportInvestigation = useCallback(async (
    investigation: Investigation,
    options: ExportOptions
  ): Promise<void> => {
    setExportState(prev => ({
      ...prev,
      isExporting: true,
      error: null
    }));

    try {
      const result = await exportService.exportInvestigation(investigation, options);

      const historyItem: ExportHistoryItem = {
        id: Date.now().toString(),
        investigationId: investigation.id,
        investigationTitle: investigation.title,
        timestamp: new Date().toISOString(),
        format: options.format.toUpperCase(),
        template: 'Custom', // This would be determined by the selected template
        status: result.success ? 'completed' : 'failed',
        filename: result.filename,
        downloadUrl: result.downloadUrl,
        error: result.error
      };

      const newHistory = [historyItem, ...exportHistory].slice(0, 50); // Keep last 50 exports
      setExportHistory(newHistory);
      saveHistoryToStorage(newHistory);

      setExportState({
        isExporting: false,
        lastExport: result,
        error: result.success ? null : result.error || 'Export failed'
      });

      if (result.success) {
        // Show success notification
        console.log(`Export completed: ${result.filename}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';

      setExportState({
        isExporting: false,
        lastExport: null,
        error: errorMessage
      });

      // Add failed export to history
      const failedHistoryItem: ExportHistoryItem = {
        id: Date.now().toString(),
        investigationId: investigation.id,
        investigationTitle: investigation.title,
        timestamp: new Date().toISOString(),
        format: options.format.toUpperCase(),
        template: 'Custom',
        status: 'failed',
        error: errorMessage
      };

      const newHistory = [failedHistoryItem, ...exportHistory].slice(0, 50);
      setExportHistory(newHistory);
      saveHistoryToStorage(newHistory);
    }
  }, [exportHistory, saveHistoryToStorage]);

  const clearError = useCallback(() => {
    setExportState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const getExportHistory = useCallback(() => {
    return exportHistory;
  }, [exportHistory]);

  const scheduleExport = useCallback(async (
    investigation: Investigation,
    options: ExportOptions,
    scheduleTime: Date
  ): Promise<void> => {
    const scheduledItem: ExportHistoryItem = {
      id: Date.now().toString(),
      investigationId: investigation.id,
      investigationTitle: investigation.title,
      timestamp: scheduleTime.toISOString(),
      format: options.format.toUpperCase(),
      template: 'Custom',
      status: 'scheduled'
    };

    const newHistory = [scheduledItem, ...exportHistory].slice(0, 50);
    setExportHistory(newHistory);
    saveHistoryToStorage(newHistory);

    // In a real implementation, you would schedule the export with a job queue
    console.log(`Export scheduled for ${scheduleTime.toLocaleString()}`);

    // For demo purposes, we'll schedule it with setTimeout if it's soon
    const delay = scheduleTime.getTime() - Date.now();
    if (delay > 0 && delay < 300000) { // Schedule if within 5 minutes
      setTimeout(() => {
        exportInvestigation(investigation, options);
      }, delay);
    }
  }, [exportHistory, saveHistoryToStorage, exportInvestigation]);

  return {
    exportState,
    exportInvestigation,
    clearError,
    getExportHistory,
    scheduleExport
  };
};