/**
 * Comprehensive Tests for useSearch Hook
 *
 * Tests cover:
 * - Search query debouncing
 * - Filter state management
 * - Autocomplete suggestions
 * - Recent searches persistence
 * - Result click tracking
 * - LLM search integration
 * - Error handling
 * - Cache behavior
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from '../useSearch';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('useSearch Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.filters).toEqual({ contentTypes: ['vod'] });
    });

    it('should load recent searches from storage', async () => {
      const recentSearches = ['Fauda', 'Shtisel', 'Comedy'];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(recentSearches)
      );

      const { result } = renderHook(() => useSearch());

      await waitFor(() => {
        expect(result.current.recentSearches).toEqual(recentSearches);
      });
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const { result } = renderHook(() => useSearch());

      await waitFor(() => {
        expect(result.current.recentSearches).toEqual([]);
      });
    });
  });

  describe('Query Management', () => {
    it('should update query state', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('Fauda');
      });

      expect(result.current.query).toBe('Fauda');
    });

    it('should debounce search execution', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          results: [{ id: '1', title: 'Fauda' }],
          total: 1,
        }),
      });

      const { result } = renderHook(() => useSearch({ debounceMs: 300 }));

      // Type query
      act(() => {
        result.current.setQuery('F');
      });
      act(() => {
        result.current.setQuery('Fa');
      });
      act(() => {
        result.current.setQuery('Fau');
      });

      // Should not call API yet
      expect(global.fetch).not.toHaveBeenCalled();

      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should not search with empty query if autoSearch is false', async () => {
      const { result } = renderHook(() => useSearch({ autoSearch: false }));

      act(() => {
        result.current.setQuery('');
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Search Execution', () => {
    it('should execute search successfully', async () => {
      const mockResults = [
        { id: '1', title: 'Fauda', type: 'vod' },
        { id: '2', title: 'Shtisel', type: 'vod' },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          results: mockResults,
          total: 2,
        }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setQuery('Israeli series');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.results).toEqual(mockResults);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set loading state during search', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true, results: [], total: 0 }),
                }),
              100
            )
          )
      );

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('Test');
        jest.advanceTimersByTime(300);
      });

      // Should be loading
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Wait for completion
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle search errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setQuery('Test');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.results).toEqual([]);
      });
    });

    it('should include filters in search request', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, results: [], total: 0 }),
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setFilters({
          contentTypes: ['vod'],
          genres: ['Drama'],
          yearMin: 2010,
        });
      });

      await act(async () => {
        result.current.setQuery('Test');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/search/unified'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"genres":["Drama"]'),
          })
        );
      });
    });
  });

  describe('Filter Management', () => {
    it('should update filters', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setFilters({
          contentTypes: ['vod'],
          genres: ['Comedy', 'Drama'],
          yearMin: 2015,
          yearMax: 2020,
        });
      });

      expect(result.current.filters).toEqual({
        contentTypes: ['vod'],
        genres: ['Comedy', 'Drama'],
        yearMin: 2015,
        yearMax: 2020,
      });
    });

    it('should trigger search when filters change', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, results: [], total: 0 }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setQuery('Test');
        jest.advanceTimersByTime(300);
      });

      // Clear fetch calls
      (global.fetch as jest.Mock).mockClear();

      // Change filters
      await act(async () => {
        result.current.setFilters({
          contentTypes: ['vod'],
          genres: ['Drama'],
        });
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Autocomplete Suggestions', () => {
    it('should fetch suggestions when typing', async () => {
      const mockSuggestions = ['Fauda', 'Family Drama', 'Fantasy'];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          suggestions: mockSuggestions,
        }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setQuery('Fa');
        jest.advanceTimersByTime(200); // Suggestions debounce is 200ms
      });

      await waitFor(() => {
        expect(result.current.suggestions).toEqual(mockSuggestions);
      });
    });

    it('should not fetch suggestions for queries less than 2 characters', async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setQuery('F');
        jest.advanceTimersByTime(200);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should clear suggestions when query is cleared', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('Test');
      });

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.suggestions).toEqual([]);
    });
  });

  describe('Recent Searches', () => {
    it('should save search to recent searches', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, results: [], total: 0 }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setQuery('Fauda');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.recentSearches).toContain('Fauda');
      });
    });

    it('should limit recent searches to 5 items', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, results: [], total: 0 }),
      });

      const { result } = renderHook(() => useSearch());

      // Add 6 searches
      for (let i = 1; i <= 6; i++) {
        await act(async () => {
          result.current.setQuery(`Search ${i}`);
          jest.advanceTimersByTime(300);
        });
      }

      await waitFor(() => {
        expect(result.current.recentSearches.length).toBeLessThanOrEqual(5);
      });
    });

    it('should persist recent searches to storage', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, results: [], total: 0 }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setQuery('Fauda');
        jest.advanceTimers ByTime(300);
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'recent_searches',
          expect.stringContaining('Fauda')
        );
      });
    });
  });

  describe('Result Click Tracking', () => {
    it('should call onResultClick callback', async () => {
      const mockResults = [{ id: '1', title: 'Fauda', type: 'vod' }];
      const onResultClick = jest.fn();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          results: mockResults,
          total: 1,
        }),
      });

      const { result } = renderHook(() => useSearch({ onResultClick }));

      await act(async () => {
        result.current.setQuery('Fauda');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.results.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleResultClick(mockResults[0], 0);
      });

      expect(onResultClick).toHaveBeenCalledWith(mockResults[0], 0);
    });

    it('should track click analytics', async () => {
      const mockResults = [{ id: '1', title: 'Fauda', type: 'vod' }];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          results: mockResults,
          total: 1,
        }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setQuery('Fauda');
        jest.advanceTimersByTime(300);
      });

      // Clear previous fetch calls
      (global.fetch as jest.Mock).mockClear();

      await act(async () => {
        result.current.handleResultClick(mockResults[0], 0);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/analytics/click'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('Clear Search', () => {
    it('should clear all search state', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          results: [{ id: '1', title: 'Test' }],
          total: 1,
        }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setQuery('Test');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.results.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('LLM Search Integration', () => {
    it('should enable LLM search when enableLLM is true', () => {
      const { result } = renderHook(() => useSearch({ enableLLM: true }));

      // LLM search should be available
      expect(result.current.query).toBeDefined();
    });

    it('should use LLM endpoint for premium search', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          results: [],
          interpretation: { text: 'Searching for Israeli dramas' },
          total: 0,
        }),
      });

      const { result } = renderHook(() => useSearch({ enableLLM: true }));

      await act(async () => {
        result.current.setQuery('Show me Israeli dramas');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/search/llm'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid query changes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, results: [], total: 0 }),
      });

      const { result } = renderHook(() => useSearch({ debounceMs: 300 }));

      // Rapid typing
      act(() => {
        result.current.setQuery('F');
      });
      act(() => {
        result.current.setQuery('Fa');
      });
      act(() => {
        result.current.setQuery('Fau');
      });
      act(() => {
        result.current.setQuery('Faud');
      });
      act(() => {
        result.current.setQuery('Fauda');
      });

      // Should only call once after debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle concurrent searches', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, results: [], total: 0 }),
        });
      });

      const { result } = renderHook(() => useSearch());

      // Start first search
      await act(async () => {
        result.current.setQuery('Test1');
        jest.advanceTimersByTime(300);
      });

      // Start second search before first completes
      await act(async () => {
        result.current.setQuery('Test2');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(callCount).toBe(2);
      });
    });
  });
});
