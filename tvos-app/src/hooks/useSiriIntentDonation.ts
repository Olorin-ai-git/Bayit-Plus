/**
 * useSiriIntentDonation - Siri Intent Donation Hook
 *
 * Donates intents to tvOS Scene Search to improve
 * Siri suggestions based on user behavior.
 */

import { useCallback } from 'react';
import { siriService } from '../services/siri';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useSiriIntentDonation');

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
