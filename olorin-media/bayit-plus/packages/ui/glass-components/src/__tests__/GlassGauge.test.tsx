/**
 * GlassGauge Component Tests
 *
 * Tests for the circular gauge component covering:
 * - Value rendering and animation
 * - Max value configuration
 * - Label display
 * - Color customization
 * - Zone configuration
 * - Accessibility
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { GlassGauge } from '../native/components/GlassGauge';
import type { RiskZone } from '../native/components/GlassGauge/types';

const mockZones: RiskZone[] = [
  { min: 0, max: 33, color: '#00ff00', label: 'Low' },
  { min: 33, max: 66, color: '#ffff00', label: 'Medium' },
  { min: 66, max: 100, color: '#ff0000', label: 'High' },
];

describe('GlassGauge', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(
        <GlassGauge
          value={50}
          max={100}
          label="CPU Usage"
          color="#0000ff"
          testID="gauge"
        />
      );

      expect(getByTestId('gauge')).toBeTruthy();
    });

    it('displays the label', () => {
      const { getByText } = render(
        <GlassGauge
          value={75}
          max={100}
          label="Memory"
          color="#00ff00"
        />
      );

      expect(getByText('Memory')).toBeTruthy();
    });

    it('displays the value percentage', () => {
      const { getByText } = render(
        <GlassGauge
          value={45}
          max={100}
          label="Usage"
          color="#ff0000"
        />
      );

      expect(getByText('45%')).toBeTruthy();
    });
  });

  describe('Value Handling', () => {
    it('handles zero value', () => {
      const { getByText } = render(
        <GlassGauge
          value={0}
          max={100}
          label="Empty"
          color="#0000ff"
        />
      );

      expect(getByText('0%')).toBeTruthy();
    });

    it('handles max value', () => {
      const { getByText } = render(
        <GlassGauge
          value={100}
          max={100}
          label="Full"
          color="#ff0000"
        />
      );

      expect(getByText('100%')).toBeTruthy();
    });

    it('handles decimal values', () => {
      const { getByText } = render(
        <GlassGauge
          value={45.7}
          max={100}
          label="Decimal"
          color="#00ff00"
        />
      );

      expect(getByText('46%')).toBeTruthy(); // Rounded
    });

    it('clamps values above max', () => {
      const { getByText } = render(
        <GlassGauge
          value={150}
          max={100}
          label="Overflow"
          color="#ff0000"
        />
      );

      expect(getByText('100%')).toBeTruthy();
    });

    it('handles custom max value', () => {
      const { getByText } = render(
        <GlassGauge
          value={50}
          max={200}
          label="Custom Max"
          color="#0000ff"
        />
      );

      expect(getByText('25%')).toBeTruthy(); // 50/200 = 25%
    });
  });

  describe('Zones Configuration', () => {
    it('renders without zones', () => {
      const { getByTestId } = render(
        <GlassGauge
          value={50}
          max={100}
          label="No Zones"
          color="#0000ff"
          showZones={false}
          testID="gauge"
        />
      );

      expect(getByTestId('gauge')).toBeTruthy();
    });

    it('renders with zones', () => {
      const { getByTestId } = render(
        <GlassGauge
          value={50}
          max={100}
          label="With Zones"
          color="#0000ff"
          showZones={true}
          zones={mockZones}
          testID="gauge"
        />
      );

      expect(getByTestId('gauge')).toBeTruthy();
    });

    it('uses default zones when showZones is true but no zones provided', () => {
      const { getByTestId } = render(
        <GlassGauge
          value={50}
          max={100}
          label="Default Zones"
          color="#0000ff"
          showZones={true}
          testID="gauge"
        />
      );

      expect(getByTestId('gauge')).toBeTruthy();
    });
  });

  describe('Color Customization', () => {
    it('accepts custom color', () => {
      const { getByTestId } = render(
        <GlassGauge
          value={50}
          max={100}
          label="Custom Color"
          color="#ff00ff"
          testID="gauge"
        />
      );

      expect(getByTestId('gauge')).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('animates value changes', () => {
      const { rerender, getByTestId } = render(
        <GlassGauge
          value={25}
          max={100}
          label="Animated"
          color="#0000ff"
          testID="gauge"
        />
      );

      expect(getByTestId('gauge')).toBeTruthy();

      // Update value
      rerender(
        <GlassGauge
          value={75}
          max={100}
          label="Animated"
          color="#0000ff"
          testID="gauge"
        />
      );

      expect(getByTestId('gauge')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has accessible label', () => {
      const { getByLabelText } = render(
        <GlassGauge
          value={60}
          max={100}
          label="CPU Usage"
          color="#0000ff"
        />
      );

      expect(getByLabelText('CPU Usage: 60%')).toBeTruthy();
    });

    it('has accessible role', () => {
      const { getByTestId } = render(
        <GlassGauge
          value={50}
          max={100}
          label="Usage"
          color="#0000ff"
          testID="gauge"
        />
      );

      const element = getByTestId('gauge');
      expect(element.props.accessibilityRole).toBe('progressbar');
    });

    it('includes value in accessibility label', () => {
      const { getByTestId } = render(
        <GlassGauge
          value={85}
          max={100}
          label="Disk"
          color="#ff0000"
          testID="gauge"
        />
      );

      const element = getByTestId('gauge');
      expect(element.props.accessibilityLabel).toContain('85');
    });
  });

  describe('Edge Cases', () => {
    it('handles negative values', () => {
      const { getByText } = render(
        <GlassGauge
          value={-10}
          max={100}
          label="Negative"
          color="#0000ff"
        />
      );

      expect(getByText('0%')).toBeTruthy(); // Clamped to 0
    });

    it('handles very large values', () => {
      const { getByText } = render(
        <GlassGauge
          value={999999}
          max={100}
          label="Large"
          color="#ff0000"
        />
      );

      expect(getByText('100%')).toBeTruthy(); // Clamped to max
    });

    it('handles zero max', () => {
      const { getByTestId } = render(
        <GlassGauge
          value={50}
          max={0}
          label="Zero Max"
          color="#0000ff"
          testID="gauge"
        />
      );

      expect(getByTestId('gauge')).toBeTruthy();
    });
  });

  describe('Custom Test IDs', () => {
    it('uses custom testID', () => {
      const { getByTestId } = render(
        <GlassGauge
          value={50}
          max={100}
          label="Custom ID"
          color="#0000ff"
          testID="my-gauge"
        />
      );

      expect(getByTestId('my-gauge')).toBeTruthy();
    });
  });
});
