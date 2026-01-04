/**
 * Core Report Hook Module
 * Provides useReport hook for single report operations
 *
 * @module useReportCore
 */

import { useState, useEffect, useCallback } from 'react';
import { Report, ReportGeneration } from '../../types/reporting';
import {
  reportingService,
  UpdateReportRequest,
  GenerateReportRequest
} from '../../services/reportingService';

/**
 * Hook for managing a single report
 * Provides CRUD operations, generation tracking, and state management for individual reports
 *
 * @param reportId - Optional report ID to load on mount
 * @returns Report state and operations including:
 *  - report: Current report data
 *  - loading: Loading state indicator
 *  - error: Error message if any
 *  - generations: List of report generations
 *  - activeGeneration: Currently selected generation
 *  - setActiveGeneration: Update active generation
 *  - loadReport: Load report by ID
 *  - updateReport: Update report properties
 *  - generateReport: Generate report in specified formats
 *  - deleteReport: Delete the current report
 */
export const useReport = (reportId?: string) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generations, setGenerations] = useState<ReportGeneration[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<ReportGeneration | null>(null);

  const loadReport = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.getReport(id);
      if (response.success && response.data) {
        setReport(response.data);
        const generationsResponse = await reportingService.listReportGenerations(id);
        if (generationsResponse.success && generationsResponse.data) {
          setGenerations(generationsResponse.data);
          const sortedGenerations = generationsResponse.data.sort(
            (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
          );
          if (sortedGenerations.length > 0) {
            setActiveGeneration(sortedGenerations[0] ?? null);
          }
        }
      } else {
        setError(response.error || 'Failed to load report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateReport = useCallback(async (updates: Partial<Report>) => {
    if (!report) return false;

    setLoading(true);
    setError(null);

    try {
      const updateRequest: UpdateReportRequest = {
        id: report.id,
        ...updates
      };

      const response = await reportingService.updateReport(updateRequest);
      if (response.success) {
        setReport(prev => prev ? { ...prev, ...updates } : null);
        return true;
      } else {
        setError(response.error || 'Failed to update report');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, [report]);

  const generateReport = useCallback(async (formats?: string[], schedule?: boolean) => {
    if (!report) return null;

    setLoading(true);
    setError(null);

    try {
      const request: GenerateReportRequest = {
        reportId: report.id,
        ...(formats !== undefined && { format: formats }),
        ...(schedule !== undefined && { schedule })
      };

      const response = await reportingService.generateReport(request);
      if (response.success && response.data) {
        await loadReport(report.id);
        return response.data.generationId;
      } else {
        setError(response.error || 'Failed to generate report');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [report, loadReport]);

  const deleteReport = useCallback(async () => {
    if (!report) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.deleteReport(report.id);
      if (response.success) {
        setReport(null);
        setGenerations([]);
        setActiveGeneration(null);
        return true;
      } else {
        setError(response.error || 'Failed to delete report');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, [report]);

  useEffect(() => {
    if (reportId) {
      loadReport(reportId);
    }
  }, [reportId, loadReport]);

  return {
    report,
    loading,
    error,
    generations,
    activeGeneration,
    setActiveGeneration,
    loadReport,
    updateReport,
    generateReport,
    deleteReport
  };
};
