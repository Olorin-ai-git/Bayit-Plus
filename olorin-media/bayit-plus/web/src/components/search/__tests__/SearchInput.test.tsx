/**
 * Test suite for SearchInput Component
 * Tests text input, clear button, focus states, and accessibility
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from '../SearchInput';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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

    expect(screen.getByPlaceholderText('controls.placeholder')).toBeInTheDocument();
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

    const input = screen.getByPlaceholderText('controls.placeholder');
    fireEvent.changeText(input, 'comedy');

    expect(mockOnChangeText).toHaveBeenCalledWith('comedy');
  });

  it('shows clear button when value is not empty', () => {
    render(
      <SearchInput
        value="drama"
        onChangeText={mockOnChangeText}
      />
    );

    const clearButton = screen.getByLabelText('empty.clearSearch');
    expect(clearButton).toBeInTheDocument();
  });

  it('does not show clear button when value is empty', () => {
    render(
      <SearchInput
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    const clearButton = screen.queryByLabelText('empty.clearSearch');
    expect(clearButton).not.toBeInTheDocument();
  });

  it('clears input when clear button is pressed', () => {
    render(
      <SearchInput
        value="thriller"
        onChangeText={mockOnChangeText}
      />
    );

    const clearButton = screen.getByLabelText('empty.clearSearch');
    fireEvent.press(clearButton);

    expect(mockOnChangeText).toHaveBeenCalledWith('');
  });

  it('has proper accessibility labels', () => {
    render(
      <SearchInput
        value="horror"
        onChangeText={mockOnChangeText}
      />
    );

    const input = screen.getByLabelText('controls.placeholder');
    expect(input).toHaveAttribute('aria-label', 'controls.placeholder');
  });

  it('applies focus styles when focused', () => {
    const { container } = render(
      <SearchInput
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    const input = screen.getByPlaceholderText('controls.placeholder');
    fireEvent.focus(input);

    // Check if focused class or style is applied
    const containerDiv = container.firstChild;
    expect(containerDiv).toHaveStyle({ borderColor: expect.any(String) });
  });

  it('removes focus styles when blurred', () => {
    const { container } = render(
      <SearchInput
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    const input = screen.getByPlaceholderText('controls.placeholder');
    fireEvent.focus(input);
    fireEvent.blur(input);

    const containerDiv = container.firstChild;
    expect(containerDiv).not.toHaveStyle({ borderColor: expect.stringContaining('168') });
  });

  it('renders search icon', () => {
    const { container } = render(
      <SearchInput
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    expect(container.textContent).toContain('🔍');
  });

  it('renders clear icon in button', () => {
    const { container } = render(
      <SearchInput
        value="test"
        onChangeText={mockOnChangeText}
      />
    );

    expect(container.textContent).toContain('✕');
  });
});
