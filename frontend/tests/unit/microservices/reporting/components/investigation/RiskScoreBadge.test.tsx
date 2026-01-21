/**
 * Unit Tests for RiskScoreBadge Component
 * Feature: 001-extensive-investigation-report
 * Task: T079
 *
 * Tests the RiskScoreBadge component which displays color-coded risk scores
 * based on 4-level thresholds: critical (80-100), high (60-79), medium (40-59), low (0-39).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RiskScoreBadge from '../../../../../../src/microservices/reporting/components/investigation/RiskScoreBadge';

describe('RiskScoreBadge', () => {
  describe('Risk Level Classification', () => {
    it('should display critical risk badge for score >= 80', () => {
      const { rerender } = render(<RiskScoreBadge score={80} />);
      expect(screen.getByText('80.0')).toBeInTheDocument();
      expect(screen.getByLabelText(/Critical Risk: 80.0/)).toBeInTheDocument();

      rerender(<RiskScoreBadge score={92.5} />);
      expect(screen.getByText('92.5')).toBeInTheDocument();
      expect(screen.getByLabelText(/Critical Risk: 92.5/)).toBeInTheDocument();

      rerender(<RiskScoreBadge score={100} />);
      expect(screen.getByText('100.0')).toBeInTheDocument();
      expect(screen.getByLabelText(/Critical Risk: 100.0/)).toBeInTheDocument();
    });

    it('should display high risk badge for score 60-79', () => {
      const { rerender } = render(<RiskScoreBadge score={60} />);
      expect(screen.getByText('60.0')).toBeInTheDocument();
      expect(screen.getByLabelText(/High Risk: 60.0/)).toBeInTheDocument();

      rerender(<RiskScoreBadge score={68.3} />);
      expect(screen.getByText('68.3')).toBeInTheDocument();
      expect(screen.getByLabelText(/High Risk: 68.3/)).toBeInTheDocument();

      rerender(<RiskScoreBadge score={79} />);
      expect(screen.getByText('79.0')).toBeInTheDocument();
      expect(screen.getByLabelText(/High Risk: 79.0/)).toBeInTheDocument();
    });

    it('should display medium risk badge for score 40-59', () => {
      const { rerender } = render(<RiskScoreBadge score={40} />);
      expect(screen.getByText('40.0')).toBeInTheDocument();
      expect(screen.getByLabelText(/Medium Risk: 40.0/)).toBeInTheDocument();

      rerender(<RiskScoreBadge score={45.2} />);
      expect(screen.getByText('45.2')).toBeInTheDocument();
      expect(screen.getByLabelText(/Medium Risk: 45.2/)).toBeInTheDocument();

      rerender(<RiskScoreBadge score={59} />);
      expect(screen.getByText('59.0')).toBeInTheDocument();
      expect(screen.getByLabelText(/Medium Risk: 59.0/)).toBeInTheDocument();
    });

    it('should display low risk badge for score 0-39', () => {
      const { rerender } = render(<RiskScoreBadge score={0} />);
      expect(screen.getByText('0.0')).toBeInTheDocument();
      expect(screen.getByLabelText(/Low Risk: 0.0/)).toBeInTheDocument();

      rerender(<RiskScoreBadge score={15.8} />);
      expect(screen.getByText('15.8')).toBeInTheDocument();
      expect(screen.getByLabelText(/Low Risk: 15.8/)).toBeInTheDocument();

      rerender(<RiskScoreBadge score={39} />);
      expect(screen.getByText('39.0')).toBeInTheDocument();
      expect(screen.getByLabelText(/Low Risk: 39.0/)).toBeInTheDocument();
    });
  });

  describe('Null and Undefined Handling', () => {
    it('should display "Unknown" badge when score is null', () => {
      render(<RiskScoreBadge score={null} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(screen.getByLabelText('Risk score unknown')).toBeInTheDocument();
    });

    it('should display "Unknown" badge when score is undefined', () => {
      render(<RiskScoreBadge score={undefined as any} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(screen.getByLabelText('Risk score unknown')).toBeInTheDocument();
    });
  });

  describe('Boundary Testing', () => {
    it('should correctly classify boundary score 79.9 as high', () => {
      render(<RiskScoreBadge score={79.9} />);
      expect(screen.getByText('79.9')).toBeInTheDocument();
      expect(screen.getByLabelText(/High Risk: 79.9/)).toBeInTheDocument();
    });

    it('should correctly classify boundary score 80.0 as critical', () => {
      render(<RiskScoreBadge score={80.0} />);
      expect(screen.getByText('80.0')).toBeInTheDocument();
      expect(screen.getByLabelText(/Critical Risk: 80.0/)).toBeInTheDocument();
    });

    it('should correctly classify boundary score 59.9 as medium', () => {
      render(<RiskScoreBadge score={59.9} />);
      expect(screen.getByText('59.9')).toBeInTheDocument();
      expect(screen.getByLabelText(/Medium Risk: 59.9/)).toBeInTheDocument();
    });

    it('should correctly classify boundary score 60.0 as high', () => {
      render(<RiskScoreBadge score={60.0} />);
      expect(screen.getByText('60.0')).toBeInTheDocument();
      expect(screen.getByLabelText(/High Risk: 60.0/)).toBeInTheDocument();
    });

    it('should correctly classify boundary score 39.9 as low', () => {
      render(<RiskScoreBadge score={39.9} />);
      expect(screen.getByText('39.9')).toBeInTheDocument();
      expect(screen.getByLabelText(/Low Risk: 39.9/)).toBeInTheDocument();
    });

    it('should correctly classify boundary score 40.0 as medium', () => {
      render(<RiskScoreBadge score={40.0} />);
      expect(screen.getByText('40.0')).toBeInTheDocument();
      expect(screen.getByLabelText(/Medium Risk: 40.0/)).toBeInTheDocument();
    });
  });

  describe('Display Format', () => {
    it('should display score with one decimal place', () => {
      const { rerender } = render(<RiskScoreBadge score={50} />);
      expect(screen.getByText('50.0')).toBeInTheDocument();

      rerender(<RiskScoreBadge score={75.123} />);
      expect(screen.getByText('75.1')).toBeInTheDocument();

      rerender(<RiskScoreBadge score={90.999} />);
      expect(screen.getByText('91.0')).toBeInTheDocument();
    });

    it('should display "/100" denominator', () => {
      render(<RiskScoreBadge score={75} />);
      expect(screen.getByText('/100', { exact: false })).toBeInTheDocument();
    });

    it('should have title attribute with full score', () => {
      render(<RiskScoreBadge score={85.5} />);
      const badge = screen.getByLabelText(/Critical Risk: 85.5/);
      expect(badge).toHaveAttribute('title', 'Risk Score: 85.5/100');
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className when provided', () => {
      render(<RiskScoreBadge score={50} className="custom-class" />);
      const badge = screen.getByLabelText(/Medium Risk: 50.0/);
      expect(badge).toHaveClass('custom-class');
    });

    it('should work without custom className', () => {
      render(<RiskScoreBadge score={50} />);
      const badge = screen.getByLabelText(/Medium Risk: 50.0/);
      expect(badge).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('should apply critical risk styles for high scores', () => {
      render(<RiskScoreBadge score={85} />);
      const badge = screen.getByLabelText(/Critical Risk: 85.0/);
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
      expect(badge).toHaveClass('border-red-300');
    });

    it('should apply high risk styles for moderate-high scores', () => {
      render(<RiskScoreBadge score={65} />);
      const badge = screen.getByLabelText(/High Risk: 65.0/);
      expect(badge).toHaveClass('bg-amber-100');
      expect(badge).toHaveClass('text-amber-800');
      expect(badge).toHaveClass('border-amber-300');
    });

    it('should apply medium risk styles for moderate scores', () => {
      render(<RiskScoreBadge score={45} />);
      const badge = screen.getByLabelText(/Medium Risk: 45.0/);
      expect(badge).toHaveClass('bg-cyan-100');
      expect(badge).toHaveClass('text-cyan-800');
      expect(badge).toHaveClass('border-cyan-300');
    });

    it('should apply low risk styles for low scores', () => {
      render(<RiskScoreBadge score={25} />);
      const badge = screen.getByLabelText(/Low Risk: 25.0/);
      expect(badge).toHaveClass('bg-gray-100');
      expect(badge).toHaveClass('text-gray-800');
      expect(badge).toHaveClass('border-gray-300');
    });

    it('should apply base badge styles', () => {
      render(<RiskScoreBadge score={50} />);
      const badge = screen.getByLabelText(/Medium Risk: 50.0/);
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('border');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label with risk level and score', () => {
      render(<RiskScoreBadge score={75} />);
      expect(screen.getByLabelText('High Risk: 75.0')).toBeInTheDocument();
    });

    it('should have title attribute for tooltip', () => {
      render(<RiskScoreBadge score={75} />);
      const badge = screen.getByLabelText(/High Risk: 75.0/);
      expect(badge).toHaveAttribute('title');
    });

    it('should use semantic HTML (span element)', () => {
      const { container } = render(<RiskScoreBadge score={50} />);
      const badge = container.querySelector('span[aria-label]');
      expect(badge).toBeInTheDocument();
    });
  });
});
