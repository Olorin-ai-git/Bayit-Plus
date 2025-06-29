import React from 'react';
import { render, screen } from '@testing-library/react';
import OverallRiskScore from '../../../src/js/components/OverallRiskScore';

describe('OverallRiskScore', () => {
  const defaultProps = {
    score: 75,
  };

  it('renders without crashing', () => {
    render(<OverallRiskScore {...defaultProps} />);
    expect(screen.getByText('Overall Risk Score')).toBeInTheDocument();
  });

  it('displays the correct score with two decimals', () => {
    render(<OverallRiskScore {...defaultProps} />);
    expect(screen.getByText('75.00')).toBeInTheDocument();
  });

  it('handles score of 0', () => {
    render(<OverallRiskScore {...defaultProps} score={0} />);
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });

  it('handles score of 100', () => {
    render(<OverallRiskScore {...defaultProps} score={100} />);
    expect(screen.getByText('100.00')).toBeInTheDocument();
  });

  it('renders the score with two decimals', () => {
    render(<OverallRiskScore score={3.14159} />);
    expect(screen.getByText('3.14')).toBeInTheDocument();
  });

  it('renders 0.00 for zero score', () => {
    render(<OverallRiskScore score={0} />);
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });

  it('renders negative scores', () => {
    render(<OverallRiskScore score={-2.5} />);
    expect(screen.getByText('-2.50')).toBeInTheDocument();
  });
});
