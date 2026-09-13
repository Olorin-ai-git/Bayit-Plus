/**
 * Test suite for SearchInput Component
 * Tests text input, clear button, focus states, and accessibility
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { colors } from '@olorin/design-tokens';
import { SearchInput } from '../SearchInput';

// Mock react-i18next
jest.mock('react-i18next', () => {
  const mockTranslate = (key: string) => key;
  return {
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({
    i18n: { language: 'en', dir: () => 'ltr' },
    t: mockTranslate,
  }),
};
});

describe('SearchInput', () => {
  const mockOnChangeText = jest.fn();

  beforeEach(() => {
    mockOnChangeText.mockClear();
  });

  it('renders with placeholder', () => {
    render(
      <SearchInput
        value=""
        onChangeText={mockOnChangeText}
        placeholder="Search content..."
      />
    );

    expect(screen.getByPlaceholderText('Search content...')).toBeInTheDocument();
  });

  it('renders with default placeholder from translations', () => {
    render(
      <SearchInput
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    expect(screen.getByPlaceholderText('search.controls.placeholder')).toBeInTheDocument();
  });

  it('displays current value', () => {
    render(
      <SearchInput
        value="action movies"
        onChangeText={mockOnChangeText}
      />
    );

    expect(screen.getByDisplayValue('action movies')).toBeInTheDocument();
  });

  it('calls onChangeText when text changes', () => {
    render(
      <SearchInput
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    const input = screen.getByPlaceholderText('search.controls.placeholder');
    fireEvent.change(input, { target: { value: 'comedy' } });

    expect(mockOnChangeText).toHaveBeenCalledWith('comedy');
  });

  it('shows clear button when value is not empty', () => {
    render(
      <SearchInput
        value="drama"
        onChangeText={mockOnChangeText}
      />
    );

    const clearButton = screen.getByLabelText('search.empty.clearSearch');
    expect(clearButton).toBeInTheDocument();
  });

  it('does not show clear button when value is empty', () => {
    render(
      <SearchInput
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    const clearButton = screen.queryByLabelText('search.empty.clearSearch');
    expect(clearButton).not.toBeInTheDocument();
  });

  it('clears input when clear button is pressed', () => {
    render(
      <SearchInput
        value="thriller"
        onChangeText={mockOnChangeText}
      />
    );

    const clearButton = screen.getByLabelText('search.empty.clearSearch');
    fireEvent.click(clearButton);

    expect(mockOnChangeText).toHaveBeenCalledWith('');
  });

  it('has proper accessibility labels', () => {
    render(
      <SearchInput
        value="horror"
        onChangeText={mockOnChangeText}
      />
    );

    const input = screen.getByLabelText('search.controls.placeholder');
    expect(input).toHaveAttribute('aria-label', 'search.controls.placeholder');
  });

  it('applies focus styles when focused', () => {
    const { container } = render(
      <SearchInput
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    const input = screen.getByPlaceholderText('search.controls.placeholder');
    fireEvent.focus(input);

    // Check if focused class or style is applied
    const containerDiv = container.firstChild;
    expect(containerDiv).toHaveStyle({ borderTopColor: colors.inputBorderFocus });
  });

  it('removes focus styles when blurred', () => {
    const { container } = render(
      <SearchInput
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    const input = screen.getByPlaceholderText('search.controls.placeholder');
    const containerDiv = container.firstElementChild!;
    const unfocusedBorder = window.getComputedStyle(containerDiv).borderTopColor;
    fireEvent.focus(input);
    expect(window.getComputedStyle(containerDiv).borderTopColor).not.toBe(unfocusedBorder);
    fireEvent.blur(input);
    expect(window.getComputedStyle(containerDiv).borderTopColor).toBe(unfocusedBorder);
  });

  it('renders search icon', () => {
    const { container } = render(
      <SearchInput
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders clear icon in button', () => {
    const { container } = render(
      <SearchInput
        value="test"
        onChangeText={mockOnChangeText}
      />
    );

    expect(screen.getByRole('button', { name: 'search.empty.clearSearch' }).querySelector('svg')).not.toBeNull();
  });
});
