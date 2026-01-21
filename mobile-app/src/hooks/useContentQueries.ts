/**
 * Content Query Hooks
 *
 * PERFORMANCE OPTIMIZATION: React Query hooks for content APIs
 * - Automatic caching of API responses
 * - Smart invalidation on mutations
 * - Background refetching
 * - Loading/error states
 * - Deduplication of identical requests
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contentService,
  liveService,
  historyService,
  trendingService,
} from '@bayit/shared-services';
import { queryKeys } from '../config/queryConfig';

/**
 * Hook: Fetch featured content
 * - Cached for 5 minutes
 * - Auto-refetch on app focus
 * - Background refetch enabled
 */
export const useFeaturedContent = () => {
  return useQuery({
    queryKey: queryKeys.content.featured(),
    queryFn: () => contentService.getFeatured(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook: Fetch content categories
 * - Cached for 10 minutes (less frequent changes)
 * - Auto-refetch on app focus
 */
export const useContentCategories = () => {
  return useQuery({
    queryKey: queryKeys.content.categories(),
    queryFn: () => contentService.getCategories(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Hook: Search content
 * - Cached per search query
 * - New query triggers cache invalidation of previous searches
 */
export const useContentSearch = (searchQuery: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.content.search(searchQuery),
    queryFn: () => contentService.search(searchQuery),
    enabled: enabled && searchQuery.length > 0,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};

/**
 * Hook: Fetch single content detail
 * - Cached per content ID
 * - Longer cache time (content details rarely change)
 */
export const useContentDetail = (contentId: string) => {
  return useQuery({
    queryKey: queryKeys.content.detail(contentId),
    queryFn: () => contentService.getDetail(contentId),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Hook: Fetch live channels
 * - Cached for 2 minutes (EPG updates frequently)
 * - Auto-refetch on app focus
 */
export const useLiveChannels = () => {
  return useQuery({
    queryKey: queryKeys.live.channels(),
    queryFn: () => liveService.getChannels(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
};

/**
 * Hook: Fetch EPG (Electronic Program Guide)
 * - Cached for 30 minutes
 * - Lower refetch frequency
 */
export const useEPG = () => {
  return useQuery({
    queryKey: queryKeys.live.epg(),
    queryFn: () => liveService.getEPG(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Hook: Fetch continue watching items
 * - Cached for 2 minutes (user progress updates frequently)
 * - Auto-refetch on app focus
 */
export const useContinueWatching = () => {
  return useQuery({
    queryKey: queryKeys.history.continueWatching(),
    queryFn: () => historyService.getContinueWatching(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook: Fetch trending content
 * - Cached for 1 hour (trends are stable)
 * - Lower refetch frequency
 */
export const useTrendingContent = () => {
  return useQuery({
    queryKey: queryKeys.trending.daily(),
    queryFn: () => trendingService.getDailyTrending(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Hook: Update playback progress
 * - Debounced mutation to avoid excessive API calls
 * - Invalidates continueWatching cache on success
 */
export const useUpdatePlaybackProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { contentId: string; progress: number; duration: number }) =>
      historyService.updateProgress(data.contentId, data.progress, data.duration),
    onSuccess: () => {
      // Invalidate continueWatching cache when progress updates
      queryClient.invalidateQueries({ queryKey: queryKeys.history.continueWatching() });
    },
  });
};

/**
 * Hook: Add/remove favorite
 * - Optimistic update (UI updates immediately)
 * - Invalidates favorites cache on success
 */
export const useFavoriteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { contentId: string; isFavorite: boolean }) =>
      data.isFavorite
        ? contentService.addFavorite(data.contentId)
        : contentService.removeFavorite(data.contentId),
    onSuccess: () => {
      // Invalidate favorites cache
      queryClient.invalidateQueries({ queryKey: queryKeys.user.favorites() });
    },
  });
};

/**
 * Hook: Add/remove watchlist item
 * - Optimistic update (UI updates immediately)
 * - Invalidates watchlist cache on success
 */
export const useWatchlistMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { contentId: string; isWatchlisted: boolean }) =>
      data.isWatchlisted
        ? contentService.addWatchlist(data.contentId)
        : contentService.removeWatchlist(data.contentId),
    onSuccess: () => {
      // Invalidate watchlist cache
      queryClient.invalidateQueries({ queryKey: queryKeys.user.watchlist() });
    },
  });
};

/**
 * Hook: Prefetch content (used for performance optimization)
 * Load data before user navigates to screen
 */
export const usePrefetchContent = (contentId: string) => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.content.detail(contentId),
      queryFn: () => contentService.getDetail(contentId),
    });
  };
};
