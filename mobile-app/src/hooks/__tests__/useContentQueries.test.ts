/**
 * useContentQueries Hook Tests
 *
 * Tests React Query hooks for content APIs:
 * - useFeaturedContent, useContentCategories, useLiveChannels, useContinueWatching
 * - Loading states, error handling, cache behavior
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFeaturedContent,
  useContentCategories,
  useLiveChannels,
  useContinueWatching,
} from '../useContentQueries';

// Mock shared services
const mockGetFeatured = jest.fn();
const mockGetCategories = jest.fn();
const mockGetChannels = jest.fn();
const mockGetContinueWatching = jest.fn();

jest.mock('@bayit/shared-services', () => ({
  contentService: {
    getFeatured: (...args: unknown[]) => mockGetFeatured(...args),
    getCategories: (...args: unknown[]) => mockGetCategories(...args),
  },
  liveService: {
    getChannels: (...args: unknown[]) => mockGetChannels(...args),
  },
  historyService: {
    getContinueWatching: (...args: unknown[]) => mockGetContinueWatching(...args),
  },
}));

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

describe('useContentQueries', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useFeaturedContent', () => {
    test('should return loading state initially', () => {
      mockGetFeatured.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useFeaturedContent(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    test('should return featured content on success', async () => {
      const featuredData = [
        { id: '1', title: 'Featured Movie', type: 'movie' },
        { id: '2', title: 'Featured Series', type: 'series' },
      ];
      mockGetFeatured.mockResolvedValue(featuredData);

      const { result } = renderHook(() => useFeaturedContent(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(featuredData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('should return error state on failure', async () => {
      const networkError = new Error('Network error');
      mockGetFeatured.mockRejectedValue(networkError);

      const { result } = renderHook(() => useFeaturedContent(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeUndefined();
    });

    test('should handle empty response', async () => {
      mockGetFeatured.mockResolvedValue([]);

      const { result } = renderHook(() => useFeaturedContent(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    test('should handle null response', async () => {
      mockGetFeatured.mockResolvedValue(null);

      const { result } = renderHook(() => useFeaturedContent(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useContentCategories', () => {
    test('should return loading state initially', () => {
      mockGetCategories.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useContentCategories(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
    });

    test('should return categories on success', async () => {
      const categories = [
        { id: 'drama', name: 'Drama' },
        { id: 'comedy', name: 'Comedy' },
        { id: 'documentary', name: 'Documentary' },
      ];
      mockGetCategories.mockResolvedValue(categories);

      const { result } = renderHook(() => useContentCategories(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(categories);
    });

    test('should return error on failure', async () => {
      mockGetCategories.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useContentCategories(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    test('should handle empty categories list', async () => {
      mockGetCategories.mockResolvedValue([]);

      const { result } = renderHook(() => useContentCategories(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useLiveChannels', () => {
    test('should return loading state initially', () => {
      mockGetChannels.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useLiveChannels(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
    });

    test('should return channels on success', async () => {
      const channels = [
        { id: 'ch1', name: 'Channel 1', isLive: true },
        { id: 'ch2', name: 'Channel 2', isLive: true },
      ];
      mockGetChannels.mockResolvedValue(channels);

      const { result } = renderHook(() => useLiveChannels(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(channels);
    });

    test('should return error on failure', async () => {
      mockGetChannels.mockRejectedValue(new Error('Stream unavailable'));

      const { result } = renderHook(() => useLiveChannels(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    test('should handle empty channels list', async () => {
      mockGetChannels.mockResolvedValue([]);

      const { result } = renderHook(() => useLiveChannels(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useContinueWatching', () => {
    test('should return loading state initially', () => {
      mockGetContinueWatching.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useContinueWatching(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
    });

    test('should return continue watching items on success', async () => {
      const watchItems = [
        { id: '1', title: 'Movie A', progress: 0.5 },
        { id: '2', title: 'Series B', progress: 0.3 },
      ];
      mockGetContinueWatching.mockResolvedValue(watchItems);

      const { result } = renderHook(() => useContinueWatching(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(watchItems);
    });

    test('should return error on failure', async () => {
      mockGetContinueWatching.mockRejectedValue(new Error('Auth required'));

      const { result } = renderHook(() => useContinueWatching(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    test('should handle no items to continue watching', async () => {
      mockGetContinueWatching.mockResolvedValue([]);

      const { result } = renderHook(() => useContinueWatching(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });
});
