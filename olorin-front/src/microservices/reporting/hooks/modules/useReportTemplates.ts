/**
 * Template & Generation Hooks Module
 * Provides useReportTemplates and useReportGeneration hooks
 *
 * @module useReportTemplates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ReportTemplate, ReportGeneration } from '../../types/reporting';
import { reportingService } from '../../services/reportingService';

/**
 * Hook for managing report templates
 * Provides CRUD operations for report templates
 *
 * @returns Template state and operations including:
 *  - templates: Array of report templates
 *  - loading: Loading state indicator
 *  - error: Error message if any
 *  - loadTemplates: Load all templates
 *  - createTemplate: Create new template
 */
export const useReportTemplates = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.listTemplates();
      if (response.success && response.data) {
        setTemplates(response.data);
      } else {
        setError(response.error || 'Failed to load templates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.createTemplate(template);
      if (response.success && response.data) {
        await loadTemplates();
        return response.data.id;
      } else {
        setError(response.error || 'Failed to create template');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadTemplates]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    loading,
    error,
    loadTemplates,
    createTemplate
  };
};

/**
 * Hook for managing report generation
 * Provides generation tracking with real-time WebSocket updates
 *
 * @param generationId - Optional generation ID to load and track
 * @returns Generation state and operations including:
 *  - generation: Current generation data
 *  - loading: Loading state indicator
 *  - error: Error message if any
 *  - loadGeneration: Load generation by ID
 *  - cancelGeneration: Cancel active generation
 *  - downloadGeneration: Get download URL for generated report
 */
export const useReportGeneration = (generationId?: string) => {
  const [generation, setGeneration] = useState<ReportGeneration | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<(() => void) | null>(null);

  const loadGeneration = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.getReportGeneration(id);
      if (response.success && response.data) {
        setGeneration(response.data);
      } else {
        setError(response.error || 'Failed to load generation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelGeneration = useCallback(async () => {
    if (!generation) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.cancelReportGeneration(generation.id);
      if (response.success) {
        await loadGeneration(generation.id);
        return true;
      } else {
        setError(response.error || 'Failed to cancel generation');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, [generation, loadGeneration]);

  const downloadGeneration = useCallback(async () => {
    if (!generation) return null;

    try {
      const response = await reportingService.downloadReportGeneration(generation.id);
      if (response.success && response.data) {
        return response.data.url;
      } else {
        setError(response.error || 'Failed to get download URL');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    }
  }, [generation]);

  useEffect(() => {
    if (generationId) {
      loadGeneration(generationId);

      const cleanup = reportingService.subscribeToGenerationUpdates(
        generationId,
        (updatedGeneration) => {
          setGeneration(updatedGeneration);
        }
      );

      wsRef.current = cleanup;

      return () => {
        if (wsRef.current) {
          wsRef.current();
        }
      };
    }
    return undefined;
  }, [generationId, loadGeneration]);

  return {
    generation,
    loading,
    error,
    loadGeneration,
    cancelGeneration,
    downloadGeneration
  };
};
