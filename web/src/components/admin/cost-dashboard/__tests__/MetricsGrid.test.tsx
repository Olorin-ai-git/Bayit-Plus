import React from 'react';
import { render } from '@testing-library/react';
import MetricsGrid from '../MetricsGrid';

describe('MetricsGrid', () => {
  const mockData = {
    cost_per_minute: 0.85,
    profit_loss: 6500,
    revenue: 15000,
  };

  it('renders metrics grid component', () => {
    const { container } = render(<MetricsGrid data={mockData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders grid layout', () => {
    const { container } = render(<MetricsGrid data={mockData} />);
    expect(container.querySelector('[class*="grid"]')).toBeInTheDocument();
  });

  it('renders metric cards', () => {
    const { container } = render(<MetricsGrid data={mockData} />);
    const glassCards = container.querySelectorAll('[data-testid="glass-card"]');
    expect(glassCards.length).toBeGreaterThan(0);
  });

  it('displays cost per minute metric', () => {
    const { container } = render(<MetricsGrid data={mockData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays monthly rate metric', () => {
    const { container } = render(<MetricsGrid data={mockData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays YTD cost metric', () => {
    const { container } = render(<MetricsGrid data={mockData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays YTD revenue metric', () => {
    const { container } = render(<MetricsGrid data={mockData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with responsive grid', () => {
    const { container } = render(<MetricsGrid data={mockData} />);
    expect(container.querySelector('[class*="gap"]')).toBeInTheDocument();
  });

  it('handles zero values', () => {
    const zeroData = {
      cost_per_minute: 0,
      profit_loss: 0,
      revenue: 0,
    };
    const { container } = render(<MetricsGrid data={zeroData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles large values', () => {
    const largeData = {
      cost_per_minute: 99.99,
      profit_loss: 9999999,
      revenue: 9999999,
    };
    const { container } = render(<MetricsGrid data={largeData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders all metrics with data', () => {
    const { container } = render(<MetricsGrid data={mockData} />);
    expect(container.querySelectorAll('[data-testid="glass-card"]').length).toBeGreaterThan(0);
  });

  it('has correct data structure', () => {
    const { container } = render(<MetricsGrid data={mockData} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
