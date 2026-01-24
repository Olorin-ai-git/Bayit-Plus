/**
 * useSearchViewMode Hook
 *
 * Manages search result view mode persistence across sessions
 * Synchronizes between localStorage and URL parameters
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logger from '../../../shared/utils/logger';

const LOG_CONTEXT = 'useSearchViewMode';
const STORAGE_KEY = '@bayit_search_view_mode';
const URL_PARAM_KEY = 'mode';

export type ViewMode = 'grid' | 'list' | 'cards';

const DEFAULT_VIEW_MODE: ViewMode = 'grid';

const VALID_VIEW_MODES: ViewMode[] = ['grid', 'list', 'cards'];

interface UseSearchViewModeReturn {
  /** Current view mode */
  viewMode: ViewMode;
  /** Update view mode (persists to localStorage and URL) */
  setViewMode: (mode: ViewMode) => void;
  /** Reset to default view mode */
  resetViewMode: () => void;
}

/**
 * Validate if a string is a valid view mode
 */
function isValidViewMode(mode: string): mode is ViewMode {
  return VALID_VIEW_MODES.includes(mode as ViewMode);
}

/**
 * Load view mode from localStorage
 */
function loadViewModeFromStorage(): ViewMode | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidViewMode(stored)) {
      return stored;
    }
  } catch (error) {
    logger.error('Failed to load view mode from localStorage', LOG_CONTEXT, error);
  }
  return null;
}

/**
 * Save view mode to localStorage
 */
function saveViewModeToStorage(mode: ViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    logger.error('Failed to save view mode to localStorage', LOG_CONTEXT, error);
  }
}

/**
 * Hook for managing search view mode persistence
 *
 * Priority order:
 * 1. URL parameter (?mode=grid|list|cards)
 * 2. localStorage (@bayit_search_view_mode)
 * 3. Default (grid)
 *
 * @example
 * ```tsx
 * const { viewMode, setViewMode } = useSearchViewMode();
 *
 * <SearchViewModeToggle value={viewMode} onChange={setViewMode} />
 *
 * {viewMode === 'grid' && <SearchResultsGrid results={results} />}
 * {viewMode === 'list' && <SearchResultsList results={results} />}
 * {viewMode === 'cards' && <SearchResultsCards results={results} />}
 * ```
 */
export function useSearchViewMode(): UseSearchViewModeReturn {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Initialize view mode from URL or storage
   */
  const getInitialViewMode = useCallback((): ViewMode => {
    // 1. Check URL parameter (highest priority)
    const searchParams = new URLSearchParams(location.search);
    const urlMode = searchParams.get(URL_PARAM_KEY);
    if (urlMode && isValidViewMode(urlMode)) {
      logger.debug('View mode from URL', LOG_CONTEXT, { mode: urlMode });
      return urlMode;
    }

    // 2. Check localStorage
    const storedMode = loadViewModeFromStorage();
    if (storedMode) {
      logger.debug('View mode from localStorage', LOG_CONTEXT, { mode: storedMode });
      return storedMode;
    }

    // 3. Default
    logger.debug('Using default view mode', LOG_CONTEXT, { mode: DEFAULT_VIEW_MODE });
    return DEFAULT_VIEW_MODE;
  }, [location.search]);

  const [viewMode, setViewModeState] = useState<ViewMode>(getInitialViewMode);

  /**
   * Sync view mode from URL on location change
   */
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlMode = searchParams.get(URL_PARAM_KEY);

    if (urlMode && isValidViewMode(urlMode) && urlMode !== viewMode) {
      logger.info('View mode changed via URL', LOG_CONTEXT, { mode: urlMode });
      setViewModeState(urlMode);
      saveViewModeToStorage(urlMode);
    }
  }, [location.search, viewMode]);

  /**
   * Update view mode (persists to both localStorage and URL)
   */
  const setViewMode = useCallback(
    (mode: ViewMode) => {
      if (!isValidViewMode(mode)) {
        logger.error('Invalid view mode', LOG_CONTEXT, { mode });
        return;
      }

      logger.info('View mode changed', LOG_CONTEXT, { from: viewMode, to: mode });

      // Update state
      setViewModeState(mode);

      // Persist to localStorage
      saveViewModeToStorage(mode);

      // Update URL parameter
      const searchParams = new URLSearchParams(location.search);
      searchParams.set(URL_PARAM_KEY, mode);
      navigate(
        {
          pathname: location.pathname,
          search: searchParams.toString(),
        },
        { replace: true }
      );
    },
    [viewMode, location, navigate]
  );

  /**
   * Reset to default view mode
   */
  const resetViewMode = useCallback(() => {
    logger.info('Resetting view mode to default', LOG_CONTEXT);
    setViewMode(DEFAULT_VIEW_MODE);
  }, [setViewMode]);

  return {
    viewMode,
    setViewMode,
    resetViewMode,
  };
}
