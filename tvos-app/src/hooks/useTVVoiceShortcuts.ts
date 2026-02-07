/**
 * useTVVoiceShortcuts - tvOS Siri Scene Search & Top Shelf Integration Hook
 *
 * Composite hook integrating:
 * - Siri search result handling (useSceneSearchHandler)
 * - Top Shelf content integration (useTopShelf)
 * - Intent donation for Siri suggestions (useSiriIntentDonation)
 * - Search result navigation
 *
 * Individual sub-hooks are in separate files for maintainability.
 */

import { useCallback } from 'react';
import { siriService } from '../services/siri';
import { useSiriIntentDonation } from './useSiriIntentDonation';
import { useSceneSearchHandler, SceneSearchResult } from './useSceneSearchHandler';
import { useTopShelf, TopShelfItem } from './useTopShelf';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useTVVoiceShortcuts');

// Re-export sub-hooks and types for backward compatibility
export { useSiriIntentDonation } from './useSiriIntentDonation';
export { useSceneSearchHandler } from './useSceneSearchHandler';
export type { SceneSearchResult } from './useSceneSearchHandler';
export { useTopShelf } from './useTopShelf';
export type { TopShelfItem } from './useTopShelf';

import type {
  UseTVVoiceShortcutsResult,
  UseSceneSearchHandlerOptions,
  UseTopShelfOptions,
} from './types/tvVoiceShortcuts.types';

export type { UseTVVoiceShortcutsResult };

/**
 * Comprehensive hook for tvOS Siri Scene Search and Top Shelf integration
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
    donatePlayIntent: intentDonation.donatePlayIntent,
    donateSearchIntent: intentDonation.donateSearchIntent,
    donateResumeIntent: intentDonation.donateResumeIntent,
    donateTopShelfIntent: intentDonation.donateTopShelfIntent,
    lastSearchResult: sceneSearch.lastSearchResult,
    handleSceneSearchLaunch: sceneSearch.handleSceneSearchLaunch,
    isProcessingSceneSearch: sceneSearch.isProcessing,
    topShelfItems: topShelf.topShelfItems,
    updateTopShelf: topShelf.updateTopShelf,
    isUpdatingTopShelf: topShelf.isUpdating,
    deleteAllShortcuts,
    getSuggestedShortcuts,
  };
};
