/**
 * useSceneSearchHandler - Scene Search Handling Hook
 *
 * Handles Scene Search deep links and navigation from
 * tvOS Siri universal search results.
 */

import { useState, useCallback } from 'react';
import { siriService } from '../services/siri';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useSceneSearchHandler');

import type { SceneSearchResult, UseSceneSearchHandlerOptions } from './types/tvVoiceShortcuts.types';

export type { SceneSearchResult, UseSceneSearchHandlerOptions };

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

