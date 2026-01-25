/**
 * useUrlImport Hook
 * Manages URL-based file imports
 */

import { useState, useCallback } from 'react';
import type { ContentType } from '../types';
import logger from '@/utils/logger';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { useTranslation } from 'react-i18next';

interface UrlValidationResult {
  url: string;
  valid: boolean;
  accessible: boolean;
  file_size?: number;
  content_type?: string;
  filename?: string;
  error?: string;
}

export const useUrlImport = () => {
  const { t } = useTranslation();
  const notifications = useNotifications();

  const [urls, setUrls] = useState<string>('');
  const [validation, setValidation] = useState<UrlValidationResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);

  /**
   * Validates URLs before upload
   * FEATURE DISABLED: Backend endpoint /admin/uploads/validate-url not yet implemented
   * Tracked in backend Phase 3 implementation
   */
  const validateUrls = useCallback(
    async (urlList: string[]): Promise<UrlValidationResult[]> => {
      setValidating(true);
      try {
        notifications.showWarning(
          'URL import feature is currently unavailable. Backend endpoints are under development.'
        );

        logger.info(
          'URL validation attempted but feature disabled - backend endpoint not implemented',
          'useUrlImport'
        );

        return [];
      } catch (err) {
        logger.error('URL validation failed', 'useUrlImport', err);
        notifications.showError(
          err instanceof Error ? err.message : t('admin.uploads.errors.urlValidationFailed')
        );
        return [];
      } finally {
        setValidating(false);
      }
    },
    [notifications, t]
  );

  /**
   * Uploads files from URLs
   * FEATURE DISABLED: Backend endpoint /admin/uploads/from-url not yet implemented
   * Tracked in backend Phase 3 implementation
   */
  const uploadFromUrls = useCallback(
    async (urlList: string[], contentType: ContentType): Promise<boolean> => {
      setUploading(true);
      try {
        notifications.showWarning(
          'URL import feature is currently unavailable. Please use browser upload instead.'
        );

        logger.info(
          'URL upload attempted but feature disabled - backend endpoint not implemented',
          'useUrlImport'
        );

        return false;
      } catch (err) {
        logger.error('URL upload failed', 'useUrlImport', err);
        notifications.showError(
          err instanceof Error ? err.message : t('admin.uploads.errors.urlUploadFailed')
        );
        return false;
      } finally {
        setUploading(false);
      }
    },
    [notifications, t]
  );

  /**
   * Parses URLs from textarea input
   */
  const parseUrls = useCallback((input: string): string[] => {
    return input
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  }, []);

  /**
   * Resets state
   */
  const reset = useCallback(() => {
    setUrls('');
    setValidation([]);
  }, []);

  return {
    urls,
    validation,
    uploading,
    validating,
    setUrls,
    validateUrls,
    uploadFromUrls,
    parseUrls,
    reset,
  };
};
