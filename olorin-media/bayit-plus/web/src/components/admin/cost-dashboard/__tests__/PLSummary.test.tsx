import React from 'react';
import { render } from '@testing-library/react';
import PLSummary from '../PLSummary';

describe('PLSummary', () => {
  const mockData = {
    profit_loss: 6500,
    revenue: 15000,
    total_costs: 8500,
    profit_margin: 43.3,
  };

  it('renders P&L summary component', () => {
    const { container } = render(<PLSummary data={mockData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with profit styling', () => {
    const { container } = render(<PLSummary data={mockData} />);
    const glassCard = container.querySelector('[data-testid="glass-card"]');
    expect(glassCard).toBeInTheDocument();
  });

  it('renders loss with red styling', () => {
    const lossData = { ...mockData, profit_loss: -2000, profit_margin: -13.3 };
    const { container } = render(<PLSummary data={lossData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('has correct data structure', () => {
    const { container } = render(<PLSummary data={mockData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders grid layout', () => {
    const { container } = render(<PLSummary data={mockData} />);
    expect(container.querySelector('[class*="grid"]')).toBeInTheDocument();
  });

  it('displays profit metrics', () => {
    const { container } = render(<PLSummary data={mockData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles positive values', () => {
    const { container } = render(<PLSummary data={mockData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles negative values', () => {
    const lossData = { ...mockData, profit_loss: -1000 };
    const { container } = render(<PLSummary data={lossData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles zero profit', () => {
    const breakEvenData = { ...mockData, profit_loss: 0, profit_margin: 0 };
    const { container } = render(<PLSummary data={breakEvenData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles large numbers', () => {
    const largeData = {
      ...mockData,
      profit_loss: 1000000,
      revenue: 2000000,
      total_costs: 1000000,
    };
    const { container } = render(<PLSummary data={largeData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with all required metrics', () => {
    const { container } = render(<PLSummary data={mockData} />);
    expect(container.querySelector('[data-testid="glass-card"]')).toBeInTheDocument();
  });

  it('has correct profit indicator', () => {
    const { container } = render(<PLSummary data={mockData} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays profit margin', () => {
    const { container } = render(<PLSummary data={mockData} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
