import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { SearchSuggestions, useSearchSuggestions } from '../SearchSuggestions';
import { renderHook, act } from '@testing-library/react-hooks';
import { searchService } from '../../../services/api';

// Mock search service
jest.mock('../../../services/api', () => ({
  searchService: {
    getSuggestions: jest.fn(),
  },
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'web',
  select: jest.fn((obj) => obj.web),
  isTV: false,
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue,
  }),
}));

// Mock useDirection hook
jest.mock('../../../hooks/useDirection', () => ({
  useDirection: () => ({
    isRTL: false,
    textAlign: 'left',
    flexDirection: 'row',
  }),
}));

describe('SearchSuggestions', () => {
  const mockOnSuggestionSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Visibility', () => {
    it('should not render when visible is false', () => {
      const { queryByText } = render(
        <SearchSuggestions
          query="test"
          visible={false}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      expect(queryByText('test')).toBeNull();
    });

    it('should not render when query is empty', () => {
      const { container } = render(
        <SearchSuggestions
          query=""
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      // Component returns null for empty query
      expect(container).toBeEmptyDOMElement();
    });

    it('should not render when query is less than 2 characters', () => {
      const { container } = render(
        <SearchSuggestions
          query="a"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('should render when visible and query >= 2 characters', async () => {
      const mockSuggestions = {
        suggestions: ['test suggestion'],
      };

      (searchService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      const { findByText } = render(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Wait for suggestions to load
      const suggestion = await findByText('test suggestion');
      expect(suggestion).toBeTruthy();
    });
  });

  describe('Debouncing', () => {
    it('should debounce API calls', async () => {
      const { rerender } = render(
        <SearchSuggestions
          query="te"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      // Should not call API yet (query < 2 chars)
      expect(searchService.getSuggestions).not.toHaveBeenCalled();

      rerender(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      // Should still not call API (debounce timer not elapsed)
      expect(searchService.getSuggestions).not.toHaveBeenCalled();

      // Fast-forward debounce timer (300ms)
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Now API should be called
      await waitFor(() => {
        expect(searchService.getSuggestions).toHaveBeenCalledWith('test');
      });
    });

    it('should cancel previous debounce timer when query changes', async () => {
      const { rerender } = render(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      // Advance 200ms (not enough to trigger)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Change query before timer completes
      rerender(
        <SearchSuggestions
          query="testing"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      // Advance remaining 100ms (total 300ms from first query)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should not call with first query
      expect(searchService.getSuggestions).not.toHaveBeenCalledWith('test');

      // Advance another 200ms (300ms from second query)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should call with second query
      await waitFor(() => {
        expect(searchService.getSuggestions).toHaveBeenCalledWith('testing');
      });
    });

    it('should use custom debounce time', async () => {
      const customDebounce = 500;

      render(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
          debounceMs={customDebounce}
        />
      );

      // Advance 300ms (default time)
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should not call yet
      expect(searchService.getSuggestions).not.toHaveBeenCalled();

      // Advance another 200ms (total 500ms)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Now should call
      await waitFor(() => {
        expect(searchService.getSuggestions).toHaveBeenCalledWith('test');
      });
    });
  });

  describe('Suggestions Display', () => {
    it('should display loading indicator while fetching', async () => {
      (searchService.getSuggestions as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ suggestions: [] }), 1000))
      );

      const { getByTestId } = render(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      // Fast-forward debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should show loading indicator
      const loadingIndicator = getByTestId('suggestions-loading');
      expect(loadingIndicator).toBeTruthy();
    });

    it('should display multiple suggestions', async () => {
      const mockSuggestions = {
        suggestions: [
          'test result 1',
          'test result 2',
          'test result 3',
        ],
      };

      (searchService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      const { findByText } = render(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(async () => {
        expect(await findByText('test result 1')).toBeTruthy();
        expect(await findByText('test result 2')).toBeTruthy();
        expect(await findByText('test result 3')).toBeTruthy();
      });
    });

    it('should respect maxSuggestions limit', async () => {
      const mockSuggestions = {
        suggestions: [
          'suggestion 1',
          'suggestion 2',
          'suggestion 3',
          'suggestion 4',
          'suggestion 5',
          'suggestion 6',
        ],
      };

      (searchService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      const { findByText, queryByText } = render(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
          maxSuggestions={3}
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should show first 3 suggestions
      await waitFor(async () => {
        expect(await findByText('suggestion 1')).toBeTruthy();
        expect(await findByText('suggestion 2')).toBeTruthy();
        expect(await findByText('suggestion 3')).toBeTruthy();
      });

      // Should not show suggestions beyond limit
      expect(queryByText('suggestion 4')).toBeNull();
      expect(queryByText('suggestion 5')).toBeNull();
      expect(queryByText('suggestion 6')).toBeNull();
    });

    it('should highlight matching portion of text', async () => {
      const mockSuggestions = {
        suggestions: [{ text: 'Avengers: Endgame' }],
      };

      (searchService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      const { findByText } = render(
        <SearchSuggestions
          query="aveng"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // The suggestion should contain the full text
      const suggestionText = await findByText(/Avengers: Endgame/);
      expect(suggestionText).toBeTruthy();
    });

    it('should handle suggestions without matching text', async () => {
      const mockSuggestions = {
        suggestions: ['completely different text'],
      };

      (searchService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      const { findByText } = render(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const suggestion = await findByText('completely different text');
      expect(suggestion).toBeTruthy();
    });
  });

  describe('Suggestion Interaction', () => {
    it('should call onSuggestionSelect when suggestion is clicked', async () => {
      const mockSuggestions = {
        suggestions: ['test suggestion'],
      };

      (searchService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      const { findByText } = render(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const suggestion = await findByText('test suggestion');
      fireEvent.press(suggestion);

      expect(mockOnSuggestionSelect).toHaveBeenCalledWith('test suggestion');
    });

    it('should handle focus on suggestions (tvOS)', async () => {
      const mockSuggestions = {
        suggestions: ['suggestion 1', 'suggestion 2'],
      };

      (searchService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      const { findByText } = render(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const suggestion = await findByText('suggestion 1');

      // Simulate focus
      fireEvent(suggestion, 'focus');

      // Should not throw error
      expect(suggestion).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (searchService.getSuggestions as jest.Mock).mockRejectedValue(
        new Error('API error')
      );

      const { container } = render(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to load suggestions:',
          expect.any(Error)
        );
      });

      // Should not crash, should show empty state
      expect(container).toBeTruthy();

      consoleError.mockRestore();
    });

    it('should handle empty suggestions array', async () => {
      (searchService.getSuggestions as jest.Mock).mockResolvedValue({
        suggestions: [],
      });

      const { container } = render(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        // Component should return null for empty suggestions
        expect(container).toBeEmptyDOMElement();
      });
    });

    it('should handle API returning null', async () => {
      (searchService.getSuggestions as jest.Mock).mockResolvedValue(null);

      const { container } = render(
        <SearchSuggestions
          query="test"
          visible={true}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
    });
  });

  describe('useSearchSuggestions Hook', () => {
    it('should return empty suggestions initially', () => {
      const { result } = renderHook(() => useSearchSuggestions(''));

      expect(result.current.suggestions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch suggestions when query changes', async () => {
      const mockSuggestions = {
        suggestions: ['test 1', 'test 2'],
      };

      (searchService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      const { result, rerender } = renderHook(
        ({ query }) => useSearchSuggestions(query),
        {
          initialProps: { query: 'te' },
        }
      );

      // Update query to trigger fetch
      rerender({ query: 'test' });

      // Fast-forward debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.suggestions).toEqual(['test 1', 'test 2']);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set loading state while fetching', async () => {
      (searchService.getSuggestions as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ suggestions: [] }), 1000))
      );

      const { result } = renderHook(() => useSearchSuggestions('test'));

      // Fast-forward debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);
    });

    it('should use custom debounce time', async () => {
      const mockSuggestions = { suggestions: ['test'] };
      (searchService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      renderHook(() => useSearchSuggestions('test', 500));

      // Advance 300ms (default time)
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should not call yet
      expect(searchService.getSuggestions).not.toHaveBeenCalled();

      // Advance another 200ms (total 500ms)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Now should call
      await waitFor(() => {
        expect(searchService.getSuggestions).toHaveBeenCalledWith('test');
      });
    });

    it('should handle API errors in hook', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (searchService.getSuggestions as jest.Mock).mockRejectedValue(
        new Error('Hook API error')
      );

      const { result } = renderHook(() => useSearchSuggestions('test'));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.suggestions).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });
});
