/**
 * Chapters Loader Hook
 * Handles loading chapter data for VOD content
 */

import { useState } from 'react';
import { chaptersService } from '@/services/api';
import { Chapter, ContentType } from '../types/watch.types';
import logger from '@/utils/logger';

interface UseChaptersLoaderResult {
  chapters: Chapter[];
  chaptersLoading: boolean;
  loadChapters: (contentId: string) => Promise<void>;
}

export function useChaptersLoader(): UseChaptersLoaderResult {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  const loadChapters = async (contentId: string) => {
    setChaptersLoading(true);
    try {
      const data = await chaptersService.getChapters(contentId);
      setChapters(data.chapters || []);
    } catch (error) {
      logger.error('Failed to load chapters', 'useChaptersLoader', error);
      setChapters([]);
    } finally {
      setChaptersLoading(false);
    }
  };

  return {
    chapters,
    chaptersLoading,
    loadChapters,
  };
}
