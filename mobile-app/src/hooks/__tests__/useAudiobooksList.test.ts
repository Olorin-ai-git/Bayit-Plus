/**
 * useAudiobooksList Hook Tests
 *
 * Tests audiobook list management:
 * - Initial fetch and loading states
 * - Pagination (loadMore)
 * - Filtering with setFilters
 * - Refresh and retry behavior
 * - Error handling
 * - Edge cases (empty list, large datasets)
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAudiobooksList } from '../useAudiobooksList';

// Mock dependencies
const mockGetAudiobooks = jest.fn();
const mockClearCache = jest.fn();

jest.mock('@/services/audiobookService', () => ({
  __esModule: true,
  default: {
    getAudiobooks: (...args: unknown[]) => mockGetAudiobooks(...args),
    clearCache: (...args: unknown[]) => mockClearCache(...args),
  },
}));

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

function createMockResponse(items: Array<{ id: string; title: string }>, total: number) {
  return { items, total };
}

describe('useAudiobooksList', () => {
  beforeEach(() => {
    mockGetAudiobooks.mockReset();
    mockClearCache.mockReset();
    mockClearCache.mockResolvedValue(undefined);
  });

  describe('initial fetch', () => {
    test('should start in loading state', () => {
      mockGetAudiobooks.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useAudiobooksList());

      expect(result.current.loading).toBe(true);
      expect(result.current.audiobooks).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    test('should load audiobooks on mount', async () => {
      const items = [
        { id: '1', title: 'Book A' },
        { id: '2', title: 'Book B' },
      ];
      mockGetAudiobooks.mockResolvedValue(createMockResponse(items, 2));

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.audiobooks).toEqual(items);
      expect(result.current.total).toBe(2);
      expect(result.current.error).toBeNull();
    });

    test('should set page size to 20 by default', async () => {
      mockGetAudiobooks.mockResolvedValue(createMockResponse([], 0));

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.pageSize).toBe(20);
    });

    test('should call service with initial filters', async () => {
      const initialFilters = { page: 1, page_size: 20, genre: 'fiction' };
      mockGetAudiobooks.mockResolvedValue(createMockResponse([], 0));

      renderHook(() => useAudiobooksList(initialFilters));

      await waitFor(() => {
        expect(mockGetAudiobooks).toHaveBeenCalledWith(
          expect.objectContaining({ genre: 'fiction', page: 1, page_size: 20 })
        );
      });
    });
  });

  describe('error handling', () => {
    test('should set error message on fetch failure', async () => {
      mockGetAudiobooks.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network timeout');
      expect(result.current.audiobooks).toEqual([]);
    });

    test('should set default error for non-Error exceptions', async () => {
      mockGetAudiobooks.mockRejectedValue('Unknown failure');

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load audiobooks');
    });

    test('should clear error on successful retry', async () => {
      mockGetAudiobooks.mockRejectedValueOnce(new Error('Server error'));

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.error).toBe('Server error');
      });

      mockGetAudiobooks.mockResolvedValueOnce(
        createMockResponse([{ id: '1', title: 'Book A' }], 1)
      );

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.audiobooks).toHaveLength(1);
    });
  });

  describe('pagination (loadMore)', () => {
    test('should calculate hasMore correctly when more items exist', async () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        title: `Book ${i}`,
      }));
      mockGetAudiobooks.mockResolvedValue(createMockResponse(items, 50));

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
    });

    test('should set hasMore to false when all items loaded', async () => {
      const items = [{ id: '1', title: 'Book A' }];
      mockGetAudiobooks.mockResolvedValue(createMockResponse(items, 1));

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
    });

    test('should append items on loadMore', async () => {
      const firstPage = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        title: `Book ${i}`,
      }));
      mockGetAudiobooks.mockResolvedValueOnce(createMockResponse(firstPage, 40));

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.audiobooks).toHaveLength(20);

      const secondPage = Array.from({ length: 20 }, (_, i) => ({
        id: String(i + 20),
        title: `Book ${i + 20}`,
      }));
      mockGetAudiobooks.mockResolvedValueOnce(createMockResponse(secondPage, 40));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.audiobooks).toHaveLength(40);
      expect(result.current.page).toBe(2);
    });

    test('should not load more when already loading', async () => {
      mockGetAudiobooks.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useAudiobooksList());

      // Still loading from initial fetch
      await act(async () => {
        await result.current.loadMore();
      });

      // Should only have been called once (initial fetch)
      expect(mockGetAudiobooks).toHaveBeenCalledTimes(1);
    });

    test('should not load more when no more items', async () => {
      const items = [{ id: '1', title: 'Only Book' }];
      mockGetAudiobooks.mockResolvedValue(createMockResponse(items, 1));

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      // Should only have been called once (initial fetch)
      expect(mockGetAudiobooks).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh', () => {
    test('should clear cache and reload from page 1', async () => {
      const initialItems = [{ id: '1', title: 'Book A' }];
      mockGetAudiobooks.mockResolvedValueOnce(createMockResponse(initialItems, 1));

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const refreshedItems = [
        { id: '1', title: 'Book A Updated' },
        { id: '2', title: 'Book B New' },
      ];
      mockGetAudiobooks.mockResolvedValueOnce(createMockResponse(refreshedItems, 2));

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockClearCache).toHaveBeenCalled();
      expect(result.current.audiobooks).toEqual(refreshedItems);
      expect(result.current.total).toBe(2);
    });

    test('should set loading to true during refresh', async () => {
      mockGetAudiobooks.mockResolvedValueOnce(createMockResponse([], 0));

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let loadingDuringRefresh = false;
      mockGetAudiobooks.mockImplementationOnce(() => {
        loadingDuringRefresh = result.current.loading;
        return Promise.resolve(createMockResponse([], 0));
      });

      await act(async () => {
        await result.current.refresh();
      });

      // Loading was set true before the fetch
      expect(loadingDuringRefresh).toBe(true);
    });
  });

  describe('setFilters', () => {
    test('should reset audiobooks and page when filters change', async () => {
      const items = [{ id: '1', title: 'Book A' }];
      mockGetAudiobooks.mockResolvedValue(createMockResponse(items, 1));

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newFilteredItems = [{ id: '3', title: 'Filtered Book' }];
      mockGetAudiobooks.mockResolvedValueOnce(createMockResponse(newFilteredItems, 1));

      act(() => {
        result.current.setFilters({ page: 1, page_size: 20, genre: 'history' });
      });

      // After setFilters, audiobooks should be cleared
      expect(result.current.audiobooks).toEqual([]);
    });
  });

  describe('retry', () => {
    test('should re-fetch from page 1', async () => {
      mockGetAudiobooks.mockRejectedValueOnce(new Error('Temporary failure'));

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      const items = [{ id: '1', title: 'Book A' }];
      mockGetAudiobooks.mockResolvedValueOnce(createMockResponse(items, 1));

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.audiobooks).toEqual(items);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle response with null items', async () => {
      mockGetAudiobooks.mockResolvedValue({ items: null, total: 0 });

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.audiobooks).toEqual([]);
    });

    test('should handle response with undefined total', async () => {
      mockGetAudiobooks.mockResolvedValue({ items: [], total: undefined });

      const { result } = renderHook(() => useAudiobooksList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.total).toBe(0);
    });

    test('should handle empty initial filters', async () => {
      mockGetAudiobooks.mockResolvedValue(createMockResponse([], 0));

      const { result } = renderHook(() => useAudiobooksList(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.audiobooks).toEqual([]);
      expect(result.current.page).toBe(1);
    });
  });
});
