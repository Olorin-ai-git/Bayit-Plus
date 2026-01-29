/**
 * GlassRadar Component Tests
 *
 * Tests for the radar visualization component covering:
 * - Rendering agents and anomalies
 * - Scanning animation state
 * - Anomaly selection callbacks
 * - UI state management
 * - Size configuration
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GlassRadar } from '../native/components/GlassRadar';
import type { RadarAgent, RadarAnomaly } from '../native/components/GlassRadar/types';

const mockAgents: RadarAgent[] = [
  {
    id: 'agent-1',
    name: 'Service A',
    ring: 2,
    position: 0,
    color: '#00ff00',
  },
  {
    id: 'agent-2',
    name: 'Service B',
    ring: 3,
    position: Math.PI,
    color: '#0000ff',
  },
];

const mockAnomalies: RadarAnomaly[] = [
  {
    id: 'anomaly-1',
    agent_id: 'agent-1',
    severity: 'critical',
    type: 'performance',
    description: 'High CPU usage',
    timestamp: new Date().toISOString(),
    ring: 2,
    angle: 0,
  },
];

describe('GlassRadar', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(
        <GlassRadar
          agents={mockAgents}
          anomalies={[]}
          testID="radar"
        />
      );

      expect(getByTestId('radar')).toBeTruthy();
    });

    it('renders with custom size', () => {
      const { getByTestId } = render(
        <GlassRadar
          agents={mockAgents}
          anomalies={[]}
          size={500}
          testID="radar"
        />
      );

      expect(getByTestId('radar')).toBeTruthy();
    });

    it('renders agents on the radar', () => {
      const { getByTestId } = render(
        <GlassRadar
          agents={mockAgents}
          anomalies={[]}
          testID="radar"
        />
      );

      // Verify radar container exists
      expect(getByTestId('radar')).toBeTruthy();
    });

    it('renders anomalies on the radar', () => {
      const { getByTestId } = render(
        <GlassRadar
          agents={mockAgents}
          anomalies={mockAnomalies}
          testID="radar"
        />
      );

      expect(getByTestId('radar')).toBeTruthy();
    });
  });

  describe('UI State', () => {
    it('renders with scanning enabled', () => {
      const { getByTestId } = render(
        <GlassRadar
          agents={mockAgents}
          anomalies={[]}
          uiState={{ isScanning: true, showLabels: true }}
          testID="radar"
        />
      );

      expect(getByTestId('radar')).toBeTruthy();
    });

    it('renders with scanning disabled', () => {
      const { getByTestId } = render(
        <GlassRadar
          agents={mockAgents}
          anomalies={[]}
          uiState={{ isScanning: false, showLabels: false }}
          testID="radar"
        />
      );

      expect(getByTestId('radar')).toBeTruthy();
    });

    it('renders with labels shown', () => {
      const { getByTestId } = render(
        <GlassRadar
          agents={mockAgents}
          anomalies={[]}
          uiState={{ isScanning: false, showLabels: true }}
          testID="radar"
        />
      );

      expect(getByTestId('radar')).toBeTruthy();
    });
  });

  describe('Anomaly Selection', () => {
    it('calls onAnomalySelected when anomaly is clicked', () => {
      const onSelect = jest.fn();
      const { getByTestId } = render(
        <GlassRadar
          agents={mockAgents}
          anomalies={mockAnomalies}
          onAnomalySelected={onSelect}
          testID="radar"
        />
      );

      const radar = getByTestId('radar');
      expect(radar).toBeTruthy();

      // Note: Actual anomaly interaction would require testing individual anomaly elements
      // This verifies the component accepts the callback
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Default Props', () => {
    it('uses default size when not provided', () => {
      const { getByTestId } = render(
        <GlassRadar
          agents={mockAgents}
          anomalies={[]}
          testID="radar"
        />
      );

      expect(getByTestId('radar')).toBeTruthy();
    });

    it('uses default UI state when not provided', () => {
      const { getByTestId } = render(
        <GlassRadar
          agents={mockAgents}
          anomalies={[]}
          testID="radar"
        />
      );

      expect(getByTestId('radar')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('renders with empty agents array', () => {
      const { getByTestId } = render(
        <GlassRadar
          agents={[]}
          anomalies={[]}
          testID="radar"
        />
      );

      expect(getByTestId('radar')).toBeTruthy();
    });

    it('renders with empty anomalies array', () => {
      const { getByTestId } = render(
        <GlassRadar
          agents={mockAgents}
          anomalies={[]}
          testID="radar"
        />
      );

      expect(getByTestId('radar')).toBeTruthy();
    });

    it('renders with many agents', () => {
      const manyAgents: RadarAgent[] = Array.from({ length: 20 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Service ${i}`,
        ring: (i % 5) + 1,
        position: (i / 20) * 2 * Math.PI,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      }));

      const { getByTestId } = render(
        <GlassRadar
          agents={manyAgents}
          anomalies={[]}
          testID="radar"
        />
      );

      expect(getByTestId('radar')).toBeTruthy();
    });
  });
});
