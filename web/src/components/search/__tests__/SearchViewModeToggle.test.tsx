/**
 * Test suite for SearchViewModeToggle Component
 * Tests view mode switching (grid/list/cards) and persistence
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SearchViewModeToggle } from '../SearchViewModeToggle';
import type { ViewMode } from '../../../hooks/useSearchViewMode';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SearchViewModeToggle', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all three view mode buttons', () => {
    render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    expect(screen.getByLabelText('viewMode.grid')).toBeInTheDocument();
    expect(screen.getByLabelText('viewMode.list')).toBeInTheDocument();
    expect(screen.getByLabelText('viewMode.cards')).toBeInTheDocument();
  });

  it('highlights grid button when grid mode is active', () => {
    render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByLabelText('viewMode.grid');
    expect(gridButton).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights list button when list mode is active', () => {
    render(
      <SearchViewModeToggle
        value="list"
        onChange={mockOnChange}
      />
    );

    const listButton = screen.getByLabelText('viewMode.list');
    expect(listButton).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights cards button when cards mode is active', () => {
    render(
      <SearchViewModeToggle
        value="cards"
        onChange={mockOnChange}
      />
    );

    const cardsButton = screen.getByLabelText('viewMode.cards');
    expect(cardsButton).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onChange with "list" when list button is pressed', () => {
    render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    const listButton = screen.getByLabelText('viewMode.list');
    fireEvent.press(listButton);

    expect(mockOnChange).toHaveBeenCalledWith('list');
  });

  it('calls onChange with "cards" when cards button is pressed', () => {
    render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    const cardsButton = screen.getByLabelText('viewMode.cards');
    fireEvent.press(cardsButton);

    expect(mockOnChange).toHaveBeenCalledWith('cards');
  });

  it('calls onChange with "grid" when grid button is pressed', () => {
    render(
      <SearchViewModeToggle
        value="list"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByLabelText('viewMode.grid');
    fireEvent.press(gridButton);

    expect(mockOnChange).toHaveBeenCalledWith('grid');
  });

  it('renders correct icons for each mode', () => {
    const { container } = render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    expect(container.textContent).toContain('⊞'); // Grid icon
    expect(container.textContent).toContain('☰'); // List icon
    expect(container.textContent).toContain('▢'); // Cards icon
  });

  it('uses primary variant for selected button', () => {
    render(
      <SearchViewModeToggle
        value="list"
        onChange={mockOnChange}
      />
    );

    const listButton = screen.getByLabelText('viewMode.list');
    expect(listButton).toHaveAttribute('data-variant', 'primary');
  });

  it('uses ghost variant for non-selected buttons', () => {
    render(
      <SearchViewModeToggle
        value="list"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByLabelText('viewMode.grid');
    const cardsButton = screen.getByLabelText('viewMode.cards');

    expect(gridButton).toHaveAttribute('data-variant', 'ghost');
    expect(cardsButton).toHaveAttribute('data-variant', 'ghost');
  });

  it('has proper accessibility states', () => {
    render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByLabelText('viewMode.grid');
    const listButton = screen.getByLabelText('viewMode.list');

    expect(gridButton).toHaveAttribute('aria-selected', 'true');
    expect(listButton).toHaveAttribute('aria-selected', 'false');
  });

  it('applies minimum touch target size', () => {
    const { container } = render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button);
      const minSize = parseInt(styles.minWidth) || 0;
      expect(minSize).toBeGreaterThanOrEqual(44);
    });
  });
});
