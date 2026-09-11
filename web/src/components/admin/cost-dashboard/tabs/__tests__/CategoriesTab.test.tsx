import '@/__tests__/support/costDashboardI18n';
import React from 'react';
import { render, screen } from '@testing-library/react';
import CategoriesTab from '../CategoriesTab';

describe('CategoriesTab', () => {
  const mockDashboard = {
    loading: { breakdown: false },
    data: { breakdown: { total_permanent: 8120, total_transient: 6620, total_platform: 14740, infrastructure_costs: { 'GCP Infrastructure': 2000 } } },
    errors: { breakdown: null },
  };

  it('renders categories tab', () => {
    render(<CategoriesTab dashboard={mockDashboard} />);
    expect(screen.getByText('Permanent vs Transient')).toBeInTheDocument();
  });

  it('displays permanent costs section', () => {
    render(<CategoriesTab dashboard={mockDashboard} />);
    expect(screen.getByText('Permanent (Fixed)')).toBeInTheDocument();
  });

  it('displays transient costs section', () => {
    render(<CategoriesTab dashboard={mockDashboard} />);
    expect(screen.getByText('Transient (Variable)')).toBeInTheDocument();
  });

  it('shows permanent costs value', () => {
    render(<CategoriesTab dashboard={mockDashboard} />);
    expect(screen.getByText('$8,120')).toBeInTheDocument();
  });

  it('shows transient costs value', () => {
    render(<CategoriesTab dashboard={mockDashboard} />);
    expect(screen.getByText('$6,620')).toBeInTheDocument();
  });

  it('displays permanent percentage', () => {
    render(<CategoriesTab dashboard={mockDashboard} />);
    expect(screen.getByText(/55.09%/)).toBeInTheDocument();
  });

  it('displays transient percentage', () => {
    render(<CategoriesTab dashboard={mockDashboard} />);
    expect(screen.getByText(/44.91%/)).toBeInTheDocument();
  });

  it('renders detailed breakdown table', () => {
    render(<CategoriesTab dashboard={mockDashboard} />);
    expect(screen.getByText('Detailed Breakdown')).toBeInTheDocument();
  });

  it('displays cost item names', () => {
    render(<CategoriesTab dashboard={mockDashboard} />);
    expect(screen.getByText('GCP Infrastructure')).toBeInTheDocument();
  });

  it('shows cost item amounts', () => {
    render(<CategoriesTab dashboard={mockDashboard} />);
    expect(screen.getByText('$2,000')).toBeInTheDocument();
  });
});
