/**
 * Content Loader Hook
 * Handles loading content data and stream URLs for all content types
 */

import { useState, useEffect } from 'react';
import { liveService, radioService, podcastService, contentService } from '@/services/api';
import { ContentData, ContentType } from '../types/watch.types';
import logger from '@/utils/logger';

interface UseContentLoaderResult {
  content: ContentData | null;
  streamUrl: string | null;
  related: any[];
  loading: boolean;
  availableSubtitleLanguages: string[];
}

export function useContentLoader(
  contentId: string,
  contentType: ContentType
): UseContentLoaderResult {
  const [content, setContent] = useState<ContentData | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableSubtitleLanguages, setAvailableSubtitleLanguages] = useState<string[]>([]);

  useEffect(() => {
    loadContent();
  }, [contentId, contentType]);

  const loadContent = async () => {
    setLoading(true);
    try {
      let data: ContentData;
      let stream: { url?: string } | undefined;

      switch (contentType) {
        case 'live':
          [data, stream] = await Promise.all([
            liveService.getChannel(contentId),
            liveService.getStreamUrl(contentId),
          ]);
          if ((data as any).available_translation_languages) {
            logger.debug('Channel available_translation_languages', 'useContentLoader', (data as any).available_translation_languages);
            setAvailableSubtitleLanguages((data as any).available_translation_languages);
          } else {
            logger.debug('No available_translation_languages in channel data', 'useContentLoader');
          }
          break;
        case 'radio':
          [data, stream] = await Promise.all([
            radioService.getStation(contentId),
            radioService.getStreamUrl(contentId),
          ]);
          break;
        case 'podcast':
          data = await podcastService.getShow(contentId);
          if (data.latestEpisode) {
            stream = { url: data.latestEpisode.audioUrl };
          }
          break;
        default:
          [data, stream] = await Promise.all([
            contentService.getById(contentId),
            contentService.getStreamUrl(contentId),
          ]);
      }

      setContent(data);
      setStreamUrl(stream?.url || null);

      if (data.related) {
        setRelated(data.related);
      }
    } catch (error) {
      logger.error('Failed to load content', 'useContentLoader', error);
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
  };
}
