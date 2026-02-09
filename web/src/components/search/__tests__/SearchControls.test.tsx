/**
 * Test suite for SearchControls component
 * Tests input rendering, content type pills, and voice integration
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SearchControls } from '../SearchControls';

// Mock react-native
jest.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div style={style} {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span style={style} {...props}>{children}</span>,
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (s: any) => s,
  },
}));

// Mock design tokens
jest.mock('@olorin/design-tokens', () => ({
  colors: {
    primary: { DEFAULT: '#6C63FF' },
    text: '#FFFFFF',
    textMuted: '#999999',
  },
  borderRadius: { sm: 4, md: 8, lg: 12 },
  spacing: { sm: 4, md: 8, lg: 16 },
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock logger
jest.mock('../../../../shared/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock voice search hook
jest.mock('../../hooks/useVoiceSearch', () => ({
  useVoiceSearch: () => ({
    transcribe: jest.fn(),
    isListening: false,
    transcript: '',
  }),
}));

// Mock sub-components
jest.mock('../SearchInput', () => ({
  SearchInput: ({ value, onChangeText, placeholder }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      placeholder={placeholder || 'Search...'}
    />
  ),
}));

jest.mock('../SearchActionButtons', () => ({
  SearchActionButtons: ({ onVoiceResult, showLLMSearch, showFilters }: any) => (
    <div data-testid="search-action-buttons">
      <button data-testid="voice-btn" onClick={() => onVoiceResult('voice result')}>
        Voice
      </button>
      {showLLMSearch && <button data-testid="llm-btn">LLM</button>}
      {showFilters && <button data-testid="filters-btn">Filters</button>}
    </div>
  ),
}));

jest.mock('../ContentTypePills', () => ({
  ContentTypePills: ({ selected, onChange }: any) => (
    <div data-testid="content-type-pills">
      {['all', 'vod', 'live', 'radio', 'podcast'].map((type) => (
        <button
          key={type}
          data-testid={`pill-${type}`}
          data-selected={selected === type}
          onClick={() => onChange(type)}
        >
          {type}
        </button>
      ))}
    </div>
  ),
}));

describe('SearchControls', () => {
  const defaultProps = {
    query: '',
    onQueryChange: jest.fn(),
  };

  beforeEach(() => {
    defaultProps.onQueryChange.mockClear();
  });

  // MARK: - Rendering

  describe('rendering', () => {
    it('renders search input', () => {
      render(<SearchControls {...defaultProps} />);
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<SearchControls {...defaultProps} />);
      expect(screen.getByTestId('search-action-buttons')).toBeInTheDocument();
    });

    it('renders content type pills when onContentTypeChange provided', () => {
      render(
        <SearchControls
          {...defaultProps}
          contentType="all"
          onContentTypeChange={jest.fn()}
        />
      );
      expect(screen.getByTestId('content-type-pills')).toBeInTheDocument();
    });

    it('does not render content type pills when onContentTypeChange not provided', () => {
      render(<SearchControls {...defaultProps} />);
      expect(screen.queryByTestId('content-type-pills')).not.toBeInTheDocument();
    });
  });

  // MARK: - Query Input

  describe('query input', () => {
    it('passes current query to input', () => {
      render(<SearchControls {...defaultProps} query="action movies" />);
      const input = screen.getByTestId('search-input') as HTMLInputElement;
      expect(input.value).toBe('action movies');
    });

    it('calls onQueryChange when input changes', () => {
      render(<SearchControls {...defaultProps} />);
      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'comedy' } });
      expect(defaultProps.onQueryChange).toHaveBeenCalledWith('comedy');
    });

    it('passes custom placeholder', () => {
      render(
        <SearchControls {...defaultProps} placeholder="Find movies..." />
      );
      const input = screen.getByTestId('search-input') as HTMLInputElement;
      expect(input.placeholder).toBe('Find movies...');
    });
  });

  // MARK: - Voice Search

  describe('voice search', () => {
    it('updates query from voice result', () => {
      render(<SearchControls {...defaultProps} />);
      const voiceBtn = screen.getByTestId('voice-btn');
      fireEvent.click(voiceBtn);
      expect(defaultProps.onQueryChange).toHaveBeenCalledWith('voice result');
    });
  });

  // MARK: - Content Type Pills

  describe('content type pills', () => {
    it('passes selected content type to pills', () => {
      render(
        <SearchControls
          {...defaultProps}
          contentType="vod"
          onContentTypeChange={jest.fn()}
        />
      );

      const vodPill = screen.getByTestId('pill-vod');
      expect(vodPill.dataset.selected).toBe('true');
    });

    it('calls onContentTypeChange when pill clicked', () => {
      const onContentTypeChange = jest.fn();
      render(
        <SearchControls
          {...defaultProps}
          contentType="all"
          onContentTypeChange={onContentTypeChange}
        />
      );

      fireEvent.click(screen.getByTestId('pill-live'));
      expect(onContentTypeChange).toHaveBeenCalledWith('live');
    });

    it('defaults content type to all', () => {
      render(
        <SearchControls
          {...defaultProps}
          onContentTypeChange={jest.fn()}
        />
      );

      const allPill = screen.getByTestId('pill-all');
      expect(allPill.dataset.selected).toBe('true');
    });
  });

  // MARK: - Feature Buttons

  describe('feature buttons', () => {
    it('shows LLM search button when enabled', () => {
      render(
        <SearchControls
          {...defaultProps}
          showLLMSearch={true}
        />
      );
      expect(screen.getByTestId('llm-btn')).toBeInTheDocument();
    });

    it('hides LLM search button by default', () => {
      render(<SearchControls {...defaultProps} />);
      expect(screen.queryByTestId('llm-btn')).not.toBeInTheDocument();
    });

    it('shows filters button by default', () => {
      render(<SearchControls {...defaultProps} />);
      expect(screen.getByTestId('filters-btn')).toBeInTheDocument();
    });

    it('hides filters button when disabled', () => {
      render(
        <SearchControls
          {...defaultProps}
          showFiltersButton={false}
        />
      );
      expect(screen.queryByTestId('filters-btn')).not.toBeInTheDocument();
    });
  });
});
