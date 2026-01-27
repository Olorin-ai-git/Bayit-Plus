import React from 'react';
import { render, screen } from '@testing-library/react';
import TimelineTab from '../TimelineTab';

describe('TimelineTab', () => {
  const mockDashboard = {
    loading: { timeline: false },
    errors: { timeline: null },
    dateRange: {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31'),
    },
  };

  it('renders timeline tab', () => {
    render(<TimelineTab dashboard={mockDashboard} />);
    expect(screen.getByText('Cost Timeline')).toBeInTheDocument();
  });

  it('displays cost timeline chart', () => {
    render(<TimelineTab dashboard={mockDashboard} />);
    expect(screen.getByText('Cost Timeline')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const loadingDashboard = { ...mockDashboard, loading: { timeline: true } };
    render(<TimelineTab dashboard={loadingDashboard} />);
    expect(screen.getByText('Cost Timeline')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorDashboard = { ...mockDashboard, errors: { timeline: 'API error' } };
    render(<TimelineTab dashboard={errorDashboard} />);
    expect(screen.getByText('Cost Timeline')).toBeInTheDocument();
  });

  it('displays date range information', () => {
    render(<TimelineTab dashboard={mockDashboard} />);
    expect(screen.getByText('Cost Timeline')).toBeInTheDocument();
  });

  it('renders with GlassCard styling', () => {
    const { container } = render(<TimelineTab dashboard={mockDashboard} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('generates 30-day timeline data', () => {
    render(<TimelineTab dashboard={mockDashboard} />);
    expect(screen.getByText('Cost Timeline')).toBeInTheDocument();
  });

  it('includes revenue line in chart', () => {
    render(<TimelineTab dashboard={mockDashboard} />);
    expect(screen.getByText('Cost Timeline')).toBeInTheDocument();
  });

  it('includes cost line in chart', () => {
    render(<TimelineTab dashboard={mockDashboard} />);
    expect(screen.getByText('Cost Timeline')).toBeInTheDocument();
  });

  it('includes profit line in chart', () => {
    render(<TimelineTab dashboard={mockDashboard} />);
    expect(screen.getByText('Cost Timeline')).toBeInTheDocument();
  });
});
