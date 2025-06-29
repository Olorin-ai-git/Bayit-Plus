import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Stopwatch from 'src/js/components/Stopwatch';

describe('Stopwatch', () => {
  const defaultProps = {
    startTime: new Date(),
    endTime: null,
    label: 'Investigation Time',
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('displays initial time correctly', () => {
    render(<Stopwatch {...defaultProps} />);
    expect(screen.getByText('0m 0s')).toBeInTheDocument();
  });

  it('updates time correctly', () => {
    render(<Stopwatch {...defaultProps} />);

    act(() => {
      jest.advanceTimersByTime(3600000); // 1 hour
    });

    expect(screen.getByText('60m 0s')).toBeInTheDocument();
  });

  it('stops updating when endTime is provided', () => {
    const mockStartTime = new Date();
    const { rerender } = render(
      <Stopwatch {...defaultProps} startTime={mockStartTime} />,
    );

    act(() => {
      jest.advanceTimersByTime(90000); // 1.5 minutes
    });

    rerender(
      <Stopwatch
        {...defaultProps}
        startTime={mockStartTime}
        endTime={new Date(mockStartTime.getTime() + 90000)}
      />,
    );

    expect(screen.getByText('1m 30s')).toBeInTheDocument();
  });

  it('handles missing startTime', () => {
    render(<Stopwatch {...defaultProps} startTime={null} />);
    expect(screen.getByText('0m 0s')).toBeInTheDocument();
  });

  it('maintains container structure', () => {
    render(<Stopwatch {...defaultProps} />);
    const container = screen.getByText('Investigation Time:').closest('div');
    expect(container).toHaveClass('flex', 'items-center', 'gap-2');
  });

  it('displays label correctly', () => {
    render(<Stopwatch {...defaultProps} label="Custom Label" />);
    expect(screen.getByText('Custom Label:')).toBeInTheDocument();
  });

  it('handles timezone differences', () => {
    const localStartTime = new Date();
    render(<Stopwatch {...defaultProps} startTime={localStartTime} />);
    expect(screen.getByText('0m 0s')).toBeInTheDocument();
  });

  it('cleans up interval on unmount', () => {
    const { unmount } = render(<Stopwatch {...defaultProps} />);
    unmount();
    // No error should be thrown about updating unmounted component
  });

  it('handles rapid start/stop', () => {
    const mockStartTime = new Date();
    const { rerender } = render(
      <Stopwatch {...defaultProps} startTime={mockStartTime} />,
    );

    act(() => {
      jest.advanceTimersByTime(1000); // 1 second
    });

    rerender(
      <Stopwatch
        {...defaultProps}
        startTime={mockStartTime}
        endTime={new Date(mockStartTime.getTime() + 1000)}
      />,
    );

    expect(screen.getByText('0m 1s')).toBeInTheDocument();
  });
});
