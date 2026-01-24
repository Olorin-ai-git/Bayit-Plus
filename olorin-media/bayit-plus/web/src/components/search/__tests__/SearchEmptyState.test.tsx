/**
 * Test suite for SearchEmptyState Component
 * Tests empty state, no results, and error scenarios
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SearchEmptyState } from '../SearchEmptyState';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SearchEmptyState', () => {
  describe('Empty Query State', () => {
    it('renders empty state message when no query', () => {
      render(<SearchEmptyState query="" />);

      expect(screen.getByText('empty.title')).toBeInTheDocument();
      expect(screen.getByText('empty.description')).toBeInTheDocument();
    });

    it('renders search icon for empty state', () => {
      const { container } = render(<SearchEmptyState query="" />);

      expect(container.textContent).toContain('🔍');
    });

    it('does not render action buttons when no query', () => {
      render(<SearchEmptyState query="" />);

      expect(screen.queryByText('empty.clearSearch')).not.toBeInTheDocument();
      expect(screen.queryByText('errors.retrySearch')).not.toBeInTheDocument();
    });
  });

  describe('No Results State', () => {
    it('renders no results message when query is provided', () => {
      render(<SearchEmptyState query="action movies" />);

      expect(screen.getByText('empty.noResults')).toBeInTheDocument();
    });

    it('displays the search query in no results message', () => {
      const { container } = render(<SearchEmptyState query="comedy shows" />);

      expect(container.textContent).toContain('comedy shows');
    });

    it('renders clear search button when query exists', () => {
      const mockOnClear = jest.fn();
      render(<SearchEmptyState query="drama" onClear={mockOnClear} />);

      expect(screen.getByText('empty.clearSearch')).toBeInTheDocument();
    });

    it('calls onClear when clear button is pressed', () => {
      const mockOnClear = jest.fn();
      render(<SearchEmptyState query="thriller" onClear={mockOnClear} />);

      const clearButton = screen.getByText('empty.clearSearch');
      fireEvent.press(clearButton);

      expect(mockOnClear).toHaveBeenCalled();
    });

    it('does not render clear button when onClear is not provided', () => {
      render(<SearchEmptyState query="horror" />);

      expect(screen.queryByText('empty.clearSearch')).not.toBeInTheDocument();
    });

    it('renders sad face icon for no results', () => {
      const { container } = render(<SearchEmptyState query="test" />);

      expect(container.textContent).toContain('😕');
    });
  });

  describe('Error State', () => {
    it('renders error message when error is provided', () => {
      render(
        <SearchEmptyState
          query="test"
          error="Network error occurred"
        />
      );

      expect(screen.getByText('errors.searchFailed')).toBeInTheDocument();
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });

    it('renders retry button when error and onRetry are provided', () => {
      const mockOnRetry = jest.fn();
      render(
        <SearchEmptyState
          query="test"
          error="Error"
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('errors.retrySearch')).toBeInTheDocument();
    });

    it('calls onRetry when retry button is pressed', () => {
      const mockOnRetry = jest.fn();
      render(
        <SearchEmptyState
          query="test"
          error="Error"
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByText('errors.retrySearch');
      fireEvent.press(retryButton);

      expect(mockOnRetry).toHaveBeenCalled();
    });

    it('does not render retry button when onRetry is not provided', () => {
      render(
        <SearchEmptyState
          query="test"
          error="Error"
        />
      );

      expect(screen.queryByText('errors.retrySearch')).not.toBeInTheDocument();
    });

    it('renders error icon for error state', () => {
      const { container } = render(
        <SearchEmptyState
          query="test"
          error="Error"
        />
      );

      expect(container.textContent).toContain('⚠️');
    });

    it('shows error state even with empty query', () => {
      render(
        <SearchEmptyState
          query=""
          error="Connection failed"
        />
      );

      expect(screen.getByText('errors.searchFailed')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  describe('Button Variants', () => {
    it('uses primary variant for retry button', () => {
      const mockOnRetry = jest.fn();
      render(
        <SearchEmptyState
          query="test"
          error="Error"
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByText('errors.retrySearch');
      expect(retryButton).toHaveAttribute('data-variant', 'primary');
    });

    it('uses secondary variant for clear button', () => {
      const mockOnClear = jest.fn();
      render(
        <SearchEmptyState
          query="test"
          onClear={mockOnClear}
        />
      );

      const clearButton = screen.getByText('empty.clearSearch');
      expect(clearButton).toHaveAttribute('data-variant', 'secondary');
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility label for retry button', () => {
      const mockOnRetry = jest.fn();
      render(
        <SearchEmptyState
          query="test"
          error="Error"
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByLabelText('errors.retrySearch');
      expect(retryButton).toBeInTheDocument();
    });

    it('has proper accessibility label for clear button', () => {
      const mockOnClear = jest.fn();
      render(
        <SearchEmptyState
          query="test"
          onClear={mockOnClear}
        />
      );

      const clearButton = screen.getByLabelText('empty.clearSearch');
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('centers content vertically and horizontally', () => {
      const { container } = render(<SearchEmptyState query="" />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveStyle({
        alignItems: 'center',
        justifyContent: 'center',
      });
    });

    it('stacks elements vertically with proper spacing', () => {
      const { container } = render(<SearchEmptyState query="test" />);

      const contentContainer = container.querySelector('.content');
      expect(contentContainer).toHaveStyle({
        gap: expect.any(Number),
      });
    });
  });

  describe('State Priority', () => {
    it('shows error state over no results state', () => {
      render(
        <SearchEmptyState
          query="test"
          error="Error occurred"
        />
      );

      expect(screen.getByText('errors.searchFailed')).toBeInTheDocument();
      expect(screen.queryByText('empty.noResults')).not.toBeInTheDocument();
    });

    it('shows no results when query exists but no error', () => {
      render(<SearchEmptyState query="test" />);

      expect(screen.getByText('empty.noResults')).toBeInTheDocument();
      expect(screen.queryByText('errors.searchFailed')).not.toBeInTheDocument();
    });

    it('shows empty state when no query and no error', () => {
      render(<SearchEmptyState query="" />);

      expect(screen.getByText('empty.title')).toBeInTheDocument();
      expect(screen.queryByText('empty.noResults')).not.toBeInTheDocument();
      expect(screen.queryByText('errors.searchFailed')).not.toBeInTheDocument();
    });
  });
});
