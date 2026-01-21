/**
 * Comments & Preview Hooks Module
 * Provides useReportComments and useReportPreview hooks
 *
 * @module useReportComments
 */

import { useState, useEffect, useCallback } from 'react';
import { ReportComment, ReportPreview, ReportConfig } from '../../types/reporting';
import { reportingService } from '../../services/reportingService';

/**
 * Hook for managing report comments
 * Provides comment CRUD operations with resolve functionality
 *
 * @param reportId - Optional report ID to load comments for
 * @returns Comments state and operations including:
 *  - comments: Array of report comments
 *  - loading: Loading state indicator
 *  - error: Error message if any
 *  - addComment: Add new comment to report
 *  - resolveComment: Mark comment as resolved/unresolved
 *  - loadComments: Load comments for report
 */
export const useReportComments = (reportId?: string) => {
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.listReportComments(id);
      if (response.success && response.data) {
        setComments(response.data);
      } else {
        setError(response.error || 'Failed to load comments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const addComment = useCallback(async (comment: Omit<ReportComment, 'id' | 'createdAt' | 'updatedAt' | 'replies'>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.addReportComment(comment);
      if (response.success && response.data) {
        if (reportId) {
          await loadComments(reportId);
        }
        return response.data.id;
      } else {
        setError(response.error || 'Failed to add comment');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [reportId, loadComments]);

  const resolveComment = useCallback(async (commentId: string, resolved: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.resolveReportComment(commentId, resolved);
      if (response.success) {
        if (reportId) {
          await loadComments(reportId);
        }
        return true;
      } else {
        setError(response.error || 'Failed to resolve comment');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, [reportId, loadComments]);

  useEffect(() => {
    if (reportId) {
      loadComments(reportId);
    }
  }, [reportId, loadComments]);

  return {
    comments,
    loading,
    error,
    addComment,
    resolveComment,
    loadComments
  };
};

/**
 * Hook for report preview
 * Provides preview generation and caching functionality
 *
 * @returns Preview state and operations including:
 *  - preview: Current preview data
 *  - loading: Loading state indicator
 *  - error: Error message if any
 *  - generatePreview: Generate preview from report configuration
 *  - clearPreview: Clear current preview
 */
export const useReportPreview = () => {
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generatePreview = useCallback(async (config: ReportConfig) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.previewReport(config);
      if (response.success && response.data) {
        setPreview(response.data);
        return response.data;
      } else {
        setError(response.error || 'Failed to generate preview');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return {
    preview,
    loading,
    error,
    generatePreview,
    clearPreview
  };
};
