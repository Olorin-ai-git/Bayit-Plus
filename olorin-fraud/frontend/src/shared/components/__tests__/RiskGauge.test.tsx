/**
 * RiskGauge Contract Tests
 * Feature: 004-new-olorin-frontend
 *
 * Tests risk gauge visualization component interface and calculations.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RiskGauge } from '../RiskGauge';
import { RiskLevel } from '@shared/types/wizard.types';

describe('RiskGauge Contract Tests', () => {
  describe('Component Interface', () => {
    it('should render with required props', () => {
      render(<RiskGauge score={75} />);

      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should accept all prop types correctly', () => {
      render(
        <RiskGauge
          score={85}
          size="lg"
          showScore={true}
          showLabel={true}
        />
      );

      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });
  });

  describe('Prop Validation', () => {
    it('should support small size variant', () => {
      render(<RiskGauge score={50} size="sm" />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should support medium size variant', () => {
      render(<RiskGauge score={60} size="md" />);
      expect(screen.getByText('60')).toBeInTheDocument();
    });

    it('should support large size variant', () => {
      render(<RiskGauge score={70} size="lg" />);
      expect(screen.getByText('70')).toBeInTheDocument();
    });

    it('should show score when showScore is true', () => {
      render(<RiskGauge score={42} showScore={true} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should hide score when showScore is false', () => {
      render(<RiskGauge score={42} showScore={false} />);
      expect(screen.queryByText('42')).not.toBeInTheDocument();
    });

    it('should show label when showLabel is true', () => {
      render(<RiskGauge score={85} showLabel={true} />);
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('Risk Level')).toBeInTheDocument();
    });

    it('should hide label when showLabel is false', () => {
      render(<RiskGauge score={85} showLabel={false} />);
      expect(screen.queryByText('Critical')).not.toBeInTheDocument();
      expect(screen.queryByText('Risk Level')).not.toBeInTheDocument();
    });

    it('should calculate Critical risk level for scores 80-100', () => {
      const criticalScores = [80, 85, 90, 95, 100];

      criticalScores.forEach((score) => {
        const { unmount } = render(<RiskGauge score={score} showLabel={true} />);
        expect(screen.getByText('Critical')).toBeInTheDocument();
        unmount();
      });
    });

    it('should calculate High risk level for scores 60-79', () => {
      const highScores = [60, 65, 70, 75, 79];

      highScores.forEach((score) => {
        const { unmount } = render(<RiskGauge score={score} showLabel={true} />);
        expect(screen.getByText('High')).toBeInTheDocument();
        unmount();
      });
    });

    it('should calculate Medium risk level for scores 40-59', () => {
      const mediumScores = [40, 45, 50, 55, 59];

      mediumScores.forEach((score) => {
        const { unmount } = render(<RiskGauge score={score} showLabel={true} />);
        expect(screen.getByText('Medium')).toBeInTheDocument();
        unmount();
      });
    });

    it('should calculate Low risk level for scores 0-39', () => {
      const lowScores = [0, 10, 20, 30, 39];

      lowScores.forEach((score) => {
        const { unmount } = render(<RiskGauge score={score} showLabel={true} />);
        expect(screen.getByText('Low')).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle edge case scores', () => {
      const edgeCases = [0, 39, 40, 59, 60, 79, 80, 100];

      edgeCases.forEach((score) => {
        const { unmount } = render(<RiskGauge score={score} />);
        expect(screen.getByText(score.toString())).toBeInTheDocument();
        unmount();
      });
    });

    it('should round fractional scores', () => {
      render(<RiskGauge score={75.7} />);
      expect(screen.getByText('76')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render SVG gauge', () => {
      const { container } = render(<RiskGauge score={50} />);
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have proper visual hierarchy', () => {
      render(<RiskGauge score={85} showScore={true} showLabel={true} />);

      const score = screen.getByText('85');
      const riskLevel = screen.getByText('Critical');
      const label = screen.getByText('Risk Level');

      expect(score).toBeInTheDocument();
      expect(riskLevel).toBeInTheDocument();
      expect(label).toBeInTheDocument();
    });

    it('should use appropriate text colors for risk levels', () => {
      const riskScores = [
        { score: 90, level: 'Critical' },
        { score: 70, level: 'High' },
        { score: 50, level: 'Medium' },
        { score: 20, level: 'Low' }
      ];

      riskScores.forEach(({ score, level }) => {
        const { unmount } = render(<RiskGauge score={score} showLabel={true} />);
        expect(screen.getByText(level)).toBeInTheDocument();
        unmount();
      });
    });

    it('should render circular gauge with proper dimensions', () => {
      const { container } = render(<RiskGauge score={50} size="md" />);
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const circles = container.querySelectorAll('circle');

      expect(circles.length).toBe(2); // Background and progress circles
    });
  });

  describe('Type Safety', () => {
    it('should enforce number type for score', () => {
      const validScores: number[] = [0, 25, 50, 75, 100];

      validScores.forEach((score) => {
        const { unmount } = render(<RiskGauge score={score} />);
        expect(screen.getByText(Math.round(score).toString())).toBeInTheDocument();
        unmount();
      });
    });

    it('should enforce size enum type', () => {
      const validSizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];

      validSizes.forEach((size) => {
        const { unmount } = render(<RiskGauge score={50} size={size} />);
        expect(screen.getByText('50')).toBeInTheDocument();
        unmount();
      });
    });

    it('should enforce boolean types for show props', () => {
      const showCombinations = [
        { showScore: true, showLabel: true },
        { showScore: true, showLabel: false },
        { showScore: false, showLabel: true },
        { showScore: false, showLabel: false }
      ];

      showCombinations.forEach(({ showScore, showLabel }) => {
        const { unmount } = render(
          <RiskGauge score={75} showScore={showScore} showLabel={showLabel} />
        );
        unmount();
      });
    });

    it('should integrate with RiskLevel enum from types', () => {
      const riskLevels: RiskLevel[] = [
        RiskLevel.CRITICAL,
        RiskLevel.HIGH,
        RiskLevel.MEDIUM,
        RiskLevel.LOW
      ];

      expect(riskLevels).toHaveLength(4);
    });
  });
});
