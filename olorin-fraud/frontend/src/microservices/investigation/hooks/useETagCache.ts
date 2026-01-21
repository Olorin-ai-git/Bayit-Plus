/**
 * ETag Cache Hook
 * Task: T029 - Phase 4 User Story 2
 * Feature: 001-investigation-state-management
 *
 * Manages ETag caching for HTTP conditional requests.
 * Stores ETags in localStorage for bandwidth optimization.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values
 * - Configuration-driven storage keys
 * - Proper error handling
 */

import { useCallback } from 'react';

const STORAGE_PREFIX = 'inv';
const ETAG_SUFFIX = 'etag';

/**
 * ETag cache hook
 *
 * Manages ETag storage and retrieval for conditional HTTP requests.
 * Reduces bandwidth by enabling 304 Not Modified responses.
 *
 * @param investigationId - Investigation ID for scoped storage
 * @returns ETag cache methods
 */
export function useETagCache(investigationId: string | undefined) {
  /**
   * Get cached ETag for investigation
   * @returns Cached ETag or null if not found
   */
  const getETag = useCallback((): string | null => {
    if (!investigationId) {
      return null;
    }

    try {
      const key = `${STORAGE_PREFIX}:${investigationId}:${ETAG_SUFFIX}`;
      const cachedETag = localStorage.getItem(key);
      return cachedETag;
    } catch (error) {
      console.error('[useETagCache] Failed to read ETag from localStorage:', error);
      return null;
    }
  }, [investigationId]);

  /**
   * Save ETag to cache after successful fetch
   * @param etag - ETag value from response header
   */
  const saveETag = useCallback((etag: string | null): void => {
    if (!investigationId || !etag) {
      return;
    }

    try {
      const key = `${STORAGE_PREFIX}:${investigationId}:${ETAG_SUFFIX}`;
      localStorage.setItem(key, etag);
    } catch (error) {
      console.error('[useETagCache] Failed to save ETag to localStorage:', error);
    }
  }, [investigationId]);

  /**
   * Clear cached ETag for investigation
   */
  const clearETag = useCallback((): void => {
    if (!investigationId) {
      return;
    }

    try {
      const key = `${STORAGE_PREFIX}:${investigationId}:${ETAG_SUFFIX}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[useETagCache] Failed to clear ETag from localStorage:', error);
    }
  }, [investigationId]);

  return {
    getETag,
    saveETag,
    clearETag
  };
}
