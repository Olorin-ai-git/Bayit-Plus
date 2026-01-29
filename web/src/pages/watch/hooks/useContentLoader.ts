/**
 * Content Loader Hook
 * Handles loading content data and stream URLs for all content types
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { liveService, radioService, podcastService, contentService } from '@/services/api';
import { ContentData, ContentType } from '../types/watch.types';
import logger from '@/utils/logger';
import { useNotificationStore } from '@olorin/glass-ui/stores';

interface UseContentLoaderResult {
  content: ContentData | null;
  streamUrl: string | null;
  related: any[];
  loading: boolean;
  availableSubtitleLanguages: string[];
  isTranscoded: boolean;
  directUrl: string | null;
}

export function useContentLoader(
  contentId: string,
  contentType: ContentType,
  initialContentData?: ContentData | null
): UseContentLoaderResult {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.add);
  const [content, setContent] = useState<ContentData | null>(initialContentData || null);
  const [streamUrl, setStreamUrl] = useState<string | null>(
    initialContentData?.video_url || null
  );
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableSubtitleLanguages, setAvailableSubtitleLanguages] = useState<string[]>([]);
  const [isTranscoded, setIsTranscoded] = useState(false);
  const [directUrl, setDirectUrl] = useState<string | null>(
    initialContentData?.video_url || null
  );

  useEffect(() => {
    loadContent();
  }, [contentId, contentType, addNotification]);

  const loadContent = async () => {
    setLoading(true);
    try {
      let data: ContentData;
      let stream: { url?: string } | undefined;

      // If initial content data was provided (scraped articles/events), use it
      if (initialContentData) {
        logger.info('Using provided content data (scraped article/event)', 'useContentLoader', {
          contentId,
          hasVideo: Boolean(initialContentData.video_url),
          hasUrl: Boolean(initialContentData.url)
        });
        setContent(initialContentData);
        setStreamUrl(initialContentData.video_url || null);
        setDirectUrl(initialContentData.video_url || null);
        setLoading(false);
        return;
      }

      // First, fetch content metadata (should work for unauthenticated users)
      try {
        switch (contentType) {
          case 'live':
            data = await liveService.getChannel(contentId);
            if ((data as any).available_translation_languages) {
              logger.debug('Channel available_translation_languages', 'useContentLoader', (data as any).available_translation_languages);
              setAvailableSubtitleLanguages((data as any).available_translation_languages);
            } else {
              logger.debug('No available_translation_languages in channel data', 'useContentLoader');
            }
            break;
          case 'radio':
            data = await radioService.getStation(contentId);
            break;
          case 'podcast':
            data = await podcastService.getShow(contentId);
            break;
          default:
            data = await contentService.getById(contentId);
        }

        setContent(data);
        if (data.related) {
          setRelated(data.related);
        }
      } catch (error: any) {
        logger.error('Failed to load content metadata', 'useContentLoader', error);
        setLoading(false);
        return;
      }

      // Then, fetch stream URL (may fail for unauthenticated users)
      try {
        logger.debug(`Fetching stream URL for ${contentType}`, 'useContentLoader', { contentId, contentType });

        switch (contentType) {
          case 'live':
            stream = await liveService.getStreamUrl(contentId);
            break;
          case 'radio':
            stream = await radioService.getStreamUrl(contentId);
            logger.debug('Radio stream response', 'useContentLoader', stream);
            break;
          case 'podcast':
            if (data.latestEpisode) {
              stream = { url: data.latestEpisode.audioUrl };
            }
            break;
          default:
            stream = await contentService.getStreamUrl(contentId);
        }

        const streamUrlValue = stream?.url || null;
        const isTranscodedValue = stream?.is_transcoded || false;
        const directUrlValue = stream?.direct_url || null;
        logger.debug('Setting stream URL', 'useContentLoader', {
          streamUrlValue,
          isTranscoded: isTranscodedValue,
          directUrl: directUrlValue
        });
        setStreamUrl(streamUrlValue);
        setIsTranscoded(isTranscodedValue);
        setDirectUrl(directUrlValue);
      } catch (error: any) {
        logger.error('Failed to load stream URL', 'useContentLoader', {
          error: error.message || error,
          status: error?.status || error?.response?.status,
          contentId,
          contentType
        });

        // Handle 401 Unauthorized - user needs to sign in
        if (error?.status === 401 || error?.response?.status === 401) {
          addNotification({
            level: 'warning',
            message: t('auth.signInRequired', 'Please sign in to watch this content'),
            title: t('auth.signInRequiredTitle', 'Sign In Required'),
            duration: 5000,
          });
        } else {
          // Show generic error notification for other failures
          addNotification({
            level: 'error',
            message: t('errors.streamLoadFailed', 'Failed to load stream. Please try again.'),
            title: t('errors.streamError', 'Stream Error'),
            duration: 5000,
          });
        }
        // Content metadata is still available, just not the stream
        setStreamUrl(null);
      }
    } catch (error) {
      logger.error('Unexpected error in loadContent', 'useContentLoader', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    content,
    streamUrl,
    related,
    loading,
    availableSubtitleLanguages,
    isTranscoded,
    directUrl,
  };
}
