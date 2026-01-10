/**
 * useContentPicker Hook
 * Manages content selection state for the content picker modal
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { liveService, radioService, contentService, podcastService } from '@/services/api';
import type { ContentItem, FlowItem, ContentType } from '../types/flows.types';
import logger from '@/utils/logger';

interface UseContentPickerOptions {
  existingItems: FlowItem[];
  defaultType?: ContentType;
}

interface UseContentPickerReturn {
  activeTab: ContentType;
  setActiveTab: (tab: ContentType) => void;
  content: ContentItem[];
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectedItems: ContentItem[];
  existingIds: Set<string>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  clearSelection: () => void;
  selectAll: () => void;
}

export const useContentPicker = ({
  existingItems,
  defaultType = 'live',
}: UseContentPickerOptions): UseContentPickerReturn => {
  const [activeTab, setActiveTab] = useState<ContentType>(defaultType);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Get existing content IDs to grey out
  const existingIds = useMemo(
    () => new Set(existingItems.map(item => item.content_id)),
    [existingItems]
  );

  // Transform API response to ContentItem format
  const transformToContentItem = useCallback((
    item: any,
    type: ContentType
  ): ContentItem => {
    return {
      id: item.id,
      title: item.title || item.name,
      type,
      thumbnail: item.thumbnail || item.logo || item.cover,
      duration: item.duration,
      description: item.description,
      category: item.category,
      isLive: type === 'live',
    };
  }, []);

  // Fetch content based on active tab
  const fetchContent = useCallback(async (type: ContentType, pageNum: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      let data: any[] = [];
      let moreAvailable = false;

      switch (type) {
        case 'live': {
          const response = await liveService.getChannels();
          // Handle both API response (response.data.channels) and demo response (response.channels)
          data = response.data?.channels || response.channels || response.data || [];
          break;
        }
        case 'radio': {
          const response = await radioService.getStations();
          data = response.data?.stations || response.stations || response.data || [];
          break;
        }
        case 'vod': {
          const categoriesResponse = await contentService.getCategories();
          const categories = categoriesResponse.data?.categories || categoriesResponse.categories || categoriesResponse.data || [];
          // Fetch content from all categories
          const allContent: any[] = [];
          for (const cat of categories.slice(0, 3)) {
            const contentResponse = await contentService.getByCategory(cat.id);
            const items = contentResponse.data?.items || contentResponse.items || contentResponse.data || [];
            allContent.push(...items.map((item: any) => ({ ...item, category: cat.name })));
          }
          data = allContent;
          break;
        }
        case 'podcast': {
          // Fetch podcasts from all categories
          let categories = [];
          try {
            const categoriesResponse = await podcastService.getCategories();
            categories = categoriesResponse.data?.categories || categoriesResponse.categories || categoriesResponse.data || [];
          } catch (err) {
            // If fetching categories fails, fall back to showing all podcasts without category filtering
            logger.warn('Failed to fetch podcast categories, showing all podcasts', 'useContentPicker', err);
          }

          const allPodcasts: any[] = [];

          // If we got categories, fetch from each one
          if (categories.length > 0) {
            for (const cat of categories) {
              try {
                const podcastResponse = await podcastService.getShows(cat.id);
                const shows = podcastResponse.data?.shows || podcastResponse.shows || podcastResponse.data || [];
                allPodcasts.push(...shows.map((show: any) => ({ ...show, category: cat.name || cat.name_en })));
              } catch (err) {
                // Skip category if fetch fails
                logger.warn(`Failed to fetch podcasts for category ${cat.id}`, 'useContentPicker', err);
              }
            }
          }

          // If no categories were fetched or all category fetches failed, show all podcasts
          if (allPodcasts.length === 0) {
            const fallbackResponse = await podcastService.getShows();
            data = fallbackResponse.data?.shows || fallbackResponse.shows || fallbackResponse.data || [];
          } else {
            data = allPodcasts;
          }
          break;
        }
      }

      const items = data.map(item => transformToContentItem(item, type));

      if (pageNum === 1) {
        setContent(items);
      } else {
        setContent(prev => [...prev, ...items]);
      }

      setHasMore(moreAvailable);
    } catch (err) {
      logger.error('Failed to fetch content', 'useContentPicker', err);
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [transformToContentItem]);

  // Fetch content when tab changes
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
    fetchContent(activeTab, 1);
  }, [activeTab, fetchContent]);

  // Toggle selection
  const toggleSelection = useCallback((id: string) => {
    // Don't allow selecting items that are already in the flow
    if (existingIds.has(id)) {
      return;
    }

    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, [existingIds]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Select all visible (non-existing) items
  const selectAll = useCallback(() => {
    const selectableIds = filteredContent
      .filter(item => !existingIds.has(item.id))
      .map(item => item.id);
    setSelectedIds(new Set(selectableIds));
  }, [existingIds]);

  // Filter content by search query
  const filteredContent = useMemo(() => {
    if (!searchQuery.trim()) return content;

    const query = searchQuery.toLowerCase();
    return content.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    );
  }, [content, searchQuery]);

  // Get selected items
  const selectedItems = useMemo(() => {
    return content.filter(item => selectedIds.has(item.id));
  }, [content, selectedIds]);

  // Load more items
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchContent(activeTab, nextPage);
    }
  }, [loading, hasMore, page, activeTab, fetchContent]);

  return {
    activeTab,
    setActiveTab,
    content: filteredContent,
    selectedIds,
    toggleSelection,
    selectedItems,
    existingIds,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    hasMore,
    loadMore,
    clearSelection,
    selectAll,
  };
};

export default useContentPicker;
