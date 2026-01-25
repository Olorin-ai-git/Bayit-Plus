/**
 * useDryRun Hook
 * Manages dry run preview mode for uploads
 */

import { useState, useCallback, useEffect } from 'react';
import type { DryRunResponse, DryRunResult, ContentType } from '../types';
import { DRY_RUN_STORAGE_KEY } from '../constants';
import logger from '@/utils/logger';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { useTranslation } from 'react-i18next';

export const useDryRun = () => {
  const { t } = useTranslation();
  const notifications = useNotifications();

  const [dryRunEnabled, setDryRunEnabled] = useState(() => {
    const stored = localStorage.getItem(DRY_RUN_STORAGE_KEY);
    return stored === 'true';
  });

  const [results, setResults] = useState<DryRunResult[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Toggle dry run mode
   */
  const toggleDryRun = useCallback((enabled: boolean) => {
    setDryRunEnabled(enabled);
    localStorage.setItem(DRY_RUN_STORAGE_KEY, enabled.toString());
  }, []);

  /**
   * Performs dry run for files
   * FEATURE DISABLED: Backend endpoint /admin/uploads/enqueue/dry-run not yet implemented
   * Tracked in backend Phase 3 implementation
   */
  const performDryRun = useCallback(
    async (files: File[], contentType: ContentType): Promise<DryRunResponse | null> => {
      setLoading(true);
      try {
        notifications.showWarning(
          'Dry run feature is currently unavailable. Backend endpoint is under development. Files will upload without preview.'
        );

        logger.info(
          'Dry run attempted but feature disabled - backend endpoint not implemented',
          'useDryRun'
        );

        return null;
      } catch (err) {
        logger.error('Dry run failed', 'useDryRun', err);
        notifications.showError(
          err instanceof Error ? err.message : t('admin.uploads.errors.dryRunFailed')
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [notifications, t]
  );

  /**
   * Filters files to only include those that would be uploaded
   */
  const getFilesToUpload = useCallback(
    (files: File[]): File[] => {
      if (results.length === 0) return files;

      return files.filter((_, index) => {
        const result = results[index];
        return result && result.would_upload;
      });
    },
    [results]
  );

  /**
   * Resets dry run state
   */
  const reset = useCallback(() => {
    setResults([]);
    setShowPreview(false);
  }, []);

  return {
    dryRunEnabled,
    results,
    showPreview,
    loading,
    toggleDryRun,
    performDryRun,
    getFilesToUpload,
    reset,
    setShowPreview,
  };
};
