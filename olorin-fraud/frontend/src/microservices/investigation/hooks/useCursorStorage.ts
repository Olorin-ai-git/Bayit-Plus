/**
 * Cursor Storage Hook
 * Feature: Phase 3 - User Story 1 (T017)
 *
 * Custom React hook for managing cursor persistence in localStorage.
 * Handles cursor reading, writing, and clearing operations with error handling.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven localStorage key pattern
 * - No hardcoded values
 * - Graceful handling of localStorage unavailability
 * - Full type safety
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook return type
 */
export interface UseCursorStorageResult {
  cursor: string | null;
  saveCursor: (newCursor: string) => void;
  clearCursor: () => void;
}

/**
 * Generate localStorage key for investigation cursor
 * Pattern: inv:{investigationId}:cursor
 */
function getCursorKey(investigationId: string): string {
  return `inv:${investigationId}:cursor`;
}

/**
 * Custom hook for localStorage cursor management
 *
 * @param investigationId - Investigation ID for cursor scoping
 * @returns Hook result with cursor value and management functions
 */
export function useCursorStorage(
  investigationId: string | undefined
): UseCursorStorageResult {
  const [cursor, setCursor] = useState<string | null>(null);

  /**
   * Load cursor from localStorage on mount
   */
  useEffect(() => {
    if (!investigationId) {
      setCursor(null);
      return;
    }

    try {
      const key = getCursorKey(investigationId);
      const storedCursor = localStorage.getItem(key);
      setCursor(storedCursor);
    } catch (err) {
      // localStorage unavailable (SSR, private mode, quota exceeded)
      console.warn('Failed to load cursor from localStorage:', err);
      setCursor(null);
    }
  }, [investigationId]);

  /**
   * Save cursor to localStorage
   */
  const saveCursor = useCallback((newCursor: string) => {
    if (!investigationId) return;

    try {
      const key = getCursorKey(investigationId);
      localStorage.setItem(key, newCursor);
      setCursor(newCursor);
    } catch (err) {
      // localStorage unavailable or quota exceeded
      console.warn('Failed to save cursor to localStorage:', err);
    }
  }, [investigationId]);

  /**
   * Clear cursor from localStorage
   */
  const clearCursor = useCallback(() => {
    if (!investigationId) return;

    try {
      const key = getCursorKey(investigationId);
      localStorage.removeItem(key);
      setCursor(null);
    } catch (err) {
      // localStorage unavailable
      console.warn('Failed to clear cursor from localStorage:', err);
    }
  }, [investigationId]);

  return {
    cursor,
    saveCursor,
    clearCursor
  };
}
