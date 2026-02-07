/**
 * useTopShelf - tvOS Top Shelf Management Hook
 *
 * Manages tvOS Top Shelf featured content display
 * on the Apple TV home screen.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { siriService } from '../services/siri';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useTopShelf');

import type { TopShelfItem, UseTopShelfOptions } from './types/tvVoiceShortcuts.types';

export type { TopShelfItem, UseTopShelfOptions };

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
