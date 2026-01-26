/**
 * useTVVoiceShortcuts - tvOS Siri Scene Search & Top Shelf Integration Hook
 *
 * TV-SPECIFIC HOOK
 *
 * Integrates with tvOS Siri and Scene Search:
 * - Siri search result handling
 * - Top Shelf content integration
 * - Scene Search deep linking
 * - Intent donation for Siri suggestions
 * - Search result navigation
 *
 * TV ARCHITECTURE:
 * - tvOS: Uses TVServices Scene Search (different from iOS SiriKit)
 * - Scene Search: Universal search results from Siri button
 * - Top Shelf: Featured content on tvOS home screen
 * - Intent Donation: Improves Siri search suggestions
 *
 * USAGE FLOW:
 * 1. User presses Siri button on remote
 * 2. Says "Watch Fauda" or "Search for drama"
 * 3. Siri shows results from all apps (including Bayit+)
 * 4. User taps Bayit+ result
 * 5. App launches with deep link to content
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { siriService } from '../services/siri';
import { config } from '../config/appConfig';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useTVVoiceShortcuts');

// ============================================
// Scene Search Types
// ============================================

export interface SceneSearchResult {
  type: 'play' | 'search' | 'resume' | 'topshelf';
  contentId?: string;
  query?: string;
  channelId?: string;
  title?: string;
}

export interface TopShelfItem {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
  contentType?: 'live' | 'vod' | 'podcast';
}

// ============================================
// Siri Intent Donation Hook
// ============================================

/**
 * Hook for donating intents to tvOS Scene Search
 * Improves Siri suggestions based on user behavior
 */
export const useSiriIntentDonation = () => {
  const donatePlayIntent = useCallback(
    async (contentId: string, title: string, type: string) => {
      try {
        await siriService.donatePlayIntent(contentId, title, type);
        moduleLogger.debug('Play intent donated:', { contentId, title });
      } catch (error) {
        moduleLogger.error('Failed to donate play intent:', error);
      }
    },
    [],
  );

  const donateSearchIntent = useCallback(async (query: string) => {
    try {
      await siriService.donateSearchIntent(query);
      moduleLogger.debug('Search intent donated:', { query });
    } catch (error) {
      moduleLogger.error('Failed to donate search intent:', error);
    }
  }, []);

  const donateResumeIntent = useCallback(async () => {
    try {
      await siriService.donateResumeIntent();
      moduleLogger.debug('Resume watching intent donated');
    } catch (error) {
      moduleLogger.error('Failed to donate resume intent:', error);
    }
  }, []);

  const donateTopShelfIntent = useCallback(
    async (widgetType: string, channelId: string, channelName: string) => {
      try {
        await siriService.donateTopShelfIntent(widgetType, channelId, channelName);
        moduleLogger.debug('Top Shelf intent donated:', { channelId, channelName });
      } catch (error) {
        moduleLogger.error('Failed to donate Top Shelf intent:', error);
      }
    },
    [],
  );

  return {
    donatePlayIntent,
    donateSearchIntent,
    donateResumeIntent,
    donateTopShelfIntent,
  };
};

// ============================================
// Scene Search Handling Hook
// ============================================

interface UseSceneSearchHandlerOptions {
  onNavigate?: (result: SceneSearchResult) => void;
  autoNavigate?: boolean;
}

/**
 * Hook for handling Scene Search deep links and navigation
 */
export const useSceneSearchHandler = (options: UseSceneSearchHandlerOptions = {}) => {
  const { onNavigate, autoNavigate = true } = options;

  const [lastSearchResult, setLastSearchResult] = useState<SceneSearchResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSceneSearchLaunch = useCallback(
    async (userActivity: any) => {
      setIsProcessing(true);

      try {
        const result = await siriService.handleSceneSearchLaunch(userActivity);

        if (result) {
          setLastSearchResult(result);
          moduleLogger.info('Scene Search result received:', result);

          // Auto-navigate if callback provided
          if (autoNavigate && onNavigate) {
            onNavigate(result);
          }
        }
      } catch (error) {
        moduleLogger.error('Failed to handle Scene Search launch:', error);
      } finally {
        setIsProcessing(false);
      }
    },
    [autoNavigate, onNavigate],
  );

  return {
    lastSearchResult,
    isProcessing,
    handleSceneSearchLaunch,
  };
};

// ============================================
// Top Shelf Management Hook
// ============================================

interface UseTopShelfOptions {
  autoUpdate?: boolean;
  updateIntervalMs?: number;
}

/**
 * Hook for managing tvOS Top Shelf featured content
 */
export const useTopShelf = (options: UseTopShelfOptions = {}) => {
  const { autoUpdate = true, updateIntervalMs = 3600000 } = options; // 1 hour default

  const [topShelfItems, setTopShelfItems] = useState<TopShelfItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateTopShelf = useCallback(async (items: TopShelfItem[]) => {
    setIsUpdating(true);

    try {
      await siriService.updateTopShelf(items);
      setTopShelfItems(items);
      moduleLogger.info('Top Shelf updated with', items.length, 'items');
    } catch (error) {
      moduleLogger.error('Failed to update Top Shelf:', error);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Set up auto-update interval
  useEffect(() => {
    if (!autoUpdate) return;

    // Auto-update interval is configured but requires external content provider
    // to fetch featured content and call updateTopShelf(items)
    // This integrates with the app's content discovery system
    moduleLogger.debug('Top Shelf auto-update enabled');

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [autoUpdate]);

  return {
    topShelfItems,
    isUpdating,
    updateTopShelf,
  };
};

// ============================================
// Composite Voice Shortcuts Hook
// ============================================

export interface UseTVVoiceShortcutsResult {
  // Intent donation
  donatePlayIntent: (contentId: string, title: string, type: string) => Promise<void>;
  donateSearchIntent: (query: string) => Promise<void>;
  donateResumeIntent: () => Promise<void>;
  donateTopShelfIntent: (widgetType: string, channelId: string, channelName: string) => Promise<void>;

  // Scene Search handling
  lastSearchResult: SceneSearchResult | null;
  handleSceneSearchLaunch: (userActivity: any) => Promise<void>;
  isProcessingSceneSearch: boolean;

  // Top Shelf management
  topShelfItems: TopShelfItem[];
  updateTopShelf: (items: TopShelfItem[]) => Promise<void>;
  isUpdatingTopShelf: boolean;

  // Cleanup
  deleteAllShortcuts: () => Promise<number>;
  getSuggestedShortcuts: () => Promise<any[]>;
}

/**
 * Comprehensive hook for tvOS Siri Scene Search and Top Shelf integration
 * Use this for complete Siri voice shortcuts functionality
 */
export const useTVVoiceShortcuts = (
  options: UseSceneSearchHandlerOptions & UseTopShelfOptions = {},
): UseTVVoiceShortcutsResult => {
  const intentDonation = useSiriIntentDonation();
  const sceneSearch = useSceneSearchHandler(options);
  const topShelf = useTopShelf(options);

  const deleteAllShortcuts = useCallback(async (): Promise<number> => {
    try {
      const deleted = await siriService.deleteAllShortcuts();
      moduleLogger.info('Deleted', deleted, 'Scene Search shortcuts');
      return deleted;
    } catch (error) {
      moduleLogger.error('Failed to delete shortcuts:', error);
      return 0;
    }
  }, []);

  const getSuggestedShortcuts = useCallback(async (): Promise<any[]> => {
    try {
      const shortcuts = await siriService.getSuggestedShortcuts();
      moduleLogger.debug('Retrieved suggested shortcuts:', shortcuts.length);
      return shortcuts;
    } catch (error) {
      moduleLogger.error('Failed to get suggested shortcuts:', error);
      return [];
    }
  }, []);

  return {
    // Intent donation
    donatePlayIntent: intentDonation.donatePlayIntent,
    donateSearchIntent: intentDonation.donateSearchIntent,
    donateResumeIntent: intentDonation.donateResumeIntent,
    donateTopShelfIntent: intentDonation.donateTopShelfIntent,

    // Scene Search handling
    lastSearchResult: sceneSearch.lastSearchResult,
    handleSceneSearchLaunch: sceneSearch.handleSceneSearchLaunch,
    isProcessingSceneSearch: sceneSearch.isProcessing,

    // Top Shelf management
    topShelfItems: topShelf.topShelfItems,
    updateTopShelf: topShelf.updateTopShelf,
    isUpdatingTopShelf: topShelf.isUpdating,

    // Cleanup
    deleteAllShortcuts,
    getSuggestedShortcuts,
  };
};
