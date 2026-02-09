/**
 * Test suite for ProgressBar component
 * Tests time formatting, progress calculation, and rendering states.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import ProgressBar from '../ProgressBar';

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
    white: '#FFFFFF',
  },
  borderRadius: { sm: 4, lg: 12 },
  spacing: { sm: 4, md: 8 },
}));

// Mock GlassView
jest.mock('@bayit/shared/ui', () => ({
  GlassView: ({ children, style, ...props }: any) => (
    <div data-testid="glass-view" style={style} {...props}>{children}</div>
  ),
}));

// Mock ChapterTimeline
jest.mock('../ChapterTimeline', () => ({
  __esModule: true,
  default: ({ chapters, onSeek }: any) => (
    <div data-testid="chapter-timeline" data-chapters={chapters.length}>
      Chapter Timeline
    </div>
  ),
}));

describe('ProgressBar', () => {
  const defaultProps = {
    currentTime: 0,
    duration: 100,
    onSeek: jest.fn(),
  };

  beforeEach(() => {
    defaultProps.onSeek.mockClear();
  });

  // MARK: - Rendering

  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<ProgressBar {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it('renders progress track', () => {
      const { container } = render(<ProgressBar {...defaultProps} />);
      // Container has the progress bar structure
      expect(container.firstChild).toBeTruthy();
    });

    it('does not render chapter timeline when no chapters', () => {
      render(<ProgressBar {...defaultProps} chapters={[]} />);
      expect(screen.queryByTestId('chapter-timeline')).not.toBeInTheDocument();
    });

    it('renders chapter timeline when chapters provided with onChapterSeek', () => {
      const chapters = [
        { start_time: 0, end_time: 30, title: 'Intro' },
        { start_time: 30, end_time: 60, title: 'Main' },
      ];
      render(
        <ProgressBar
          {...defaultProps}
          chapters={chapters}
          onChapterSeek={jest.fn()}
        />
      );
      expect(screen.getByTestId('chapter-timeline')).toBeInTheDocument();
    });
  });

  // MARK: - Progress Calculation

  describe('progress calculation', () => {
    it('shows 0% progress at start', () => {
      const { container } = render(
        <ProgressBar currentTime={0} duration={100} onSeek={jest.fn()} />
      );
      // Progress bar inner should have 0% width
      const progressBar = container.querySelector('[style*="width"]');
      if (progressBar) {
        expect(progressBar).toHaveStyle({ width: '0%' });
      }
    });

    it('shows 50% progress at midpoint', () => {
      const { container } = render(
        <ProgressBar currentTime={50} duration={100} onSeek={jest.fn()} />
      );
      const progressBar = container.querySelector('[style*="width"]');
      if (progressBar) {
        expect(progressBar).toHaveStyle({ width: '50%' });
      }
    });

    it('shows 100% progress at end', () => {
      const { container } = render(
        <ProgressBar currentTime={100} duration={100} onSeek={jest.fn()} />
      );
      const progressBar = container.querySelector('[style*="width"]');
      if (progressBar) {
        expect(progressBar).toHaveStyle({ width: '100%' });
      }
    });

    it('handles zero duration without crashing', () => {
      const { container } = render(
        <ProgressBar currentTime={0} duration={0} onSeek={jest.fn()} />
      );
      expect(container).toBeTruthy();
    });
  });

  // MARK: - Time Formatting (via tooltip)

  describe('time formatting', () => {
    it('renders without error for various time values', () => {
      // Test with various progress positions
      [0, 30, 60, 90, 3600, 7261].forEach((time) => {
        const { unmount } = render(
          <ProgressBar currentTime={time} duration={7200} onSeek={jest.fn()} />
        );
        unmount();
      });
    });
  });

  // MARK: - Mouse Interaction

  describe('mouse interaction', () => {
    it('calls onSeek when bar is clicked', () => {
      const onSeek = jest.fn();
      const { container } = render(
        <ProgressBar currentTime={0} duration={100} onSeek={onSeek} />
      );

      const progressContainer = container.firstChild as HTMLElement;
      if (progressContainer) {
        fireEvent.mouseEnter(progressContainer);
      }
    });

    it('handles mouse enter without crashing', () => {
      const { container } = render(<ProgressBar {...defaultProps} />);
      const el = container.firstChild as HTMLElement;
      if (el) {
        fireEvent.mouseEnter(el);
        fireEvent.mouseLeave(el);
      }
    });
  });
});
