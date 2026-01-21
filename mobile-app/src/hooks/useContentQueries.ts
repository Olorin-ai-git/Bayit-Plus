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

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  contentService,
  liveService,
  historyService,
} from '@bayit/shared-services';
import { queryKeys } from '../config/queryConfig';

/**
 * Hook: Fetch featured content
 * - Cached for 5 minutes
 * - Auto-refetch on app focus
 * - Background refetch enabled
 */
export const useFeaturedContent = () => {
  return useQuery<any>({
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
  return useQuery<any>({
    queryKey: queryKeys.content.categories(),
    queryFn: () => contentService.getCategories(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Hook: Fetch live channels
 * - Cached for 2 minutes (channels update frequently)
 * - Auto-refetch on app focus
 */
export const useLiveChannels = () => {
  return useQuery<any>({
    queryKey: queryKeys.live.channels(),
    queryFn: () => liveService.getChannels(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
};

/**
 * Hook: Fetch continue watching items
 * - Cached for 2 minutes (user progress updates frequently)
 * - Auto-refetch on app focus
 */
export const useContinueWatching = () => {
  return useQuery<any>({
    queryKey: queryKeys.history.continueWatching(),
    queryFn: () => historyService.getContinueWatching(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
