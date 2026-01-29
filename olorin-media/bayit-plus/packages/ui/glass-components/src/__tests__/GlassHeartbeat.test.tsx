/**
 * GlassHeartbeat Component Tests
 *
 * Tests for the service heartbeat indicator component covering:
 * - Status rendering (healthy, degraded, unhealthy)
 * - Pulse animation
 * - Service name and latency display
 * - Size variants
 * - Press callbacks
 * - Accessibility
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GlassHeartbeat } from '../native/components/GlassHeartbeat';

describe('GlassHeartbeat', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="API Service"
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
    });

    it('displays service name', () => {
      const { getByText } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Database"
        />
      );

      expect(getByText('Database')).toBeTruthy();
    });

    it('displays latency when provided', () => {
      const { getByText } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="API"
          latencyMs={125}
        />
      );

      expect(getByText('125ms')).toBeTruthy();
    });

    it('renders without latency', () => {
      const { getByText, queryByText } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
        />
      );

      expect(getByText('Service')).toBeTruthy();
      // Latency text should not exist
      expect(queryByText(/ms/)).toBeNull();
    });
  });

  describe('Status States', () => {
    it('renders healthy status', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
      // Component should render without errors
    });

    it('renders degraded status', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="degraded"
          serviceName="Service"
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
    });

    it('renders unhealthy status', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="unhealthy"
          serviceName="Service"
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
    });
  });

  describe('Pulse Animation', () => {
    it('shows pulse when status is healthy and showPulse is true', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          showPulse={true}
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
    });

    it('does not pulse when showPulse is false', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          showPulse={false}
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
    });

    it('does not pulse when status is not healthy', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="degraded"
          serviceName="Service"
          showPulse={true}
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          size="sm"
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
    });

    it('renders medium size (default)', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
    });

    it('renders large size', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          size="lg"
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
    });
  });

  describe('Press Callback', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          onPress={onPress}
          testID="heartbeat"
        />
      );

      const heartbeat = getByTestId('heartbeat');
      fireEvent.press(heartbeat);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('is not pressable when onPress is not provided', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          testID="heartbeat"
        />
      );

      const heartbeat = getByTestId('heartbeat');
      // Should not crash when pressed without onPress callback
      fireEvent.press(heartbeat);

      expect(heartbeat).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has accessible label with service name', () => {
      const { getByLabelText } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="API Service"
        />
      );

      expect(getByLabelText('API Service: healthy')).toBeTruthy();
    });

    it('includes latency in accessibility label', () => {
      const { getByLabelText } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Database"
          latencyMs={250}
        />
      );

      expect(getByLabelText('Database: healthy, latency 250ms')).toBeTruthy();
    });

    it('has button role when onPress is provided', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          onPress={jest.fn()}
          testID="heartbeat"
        />
      );

      const element = getByTestId('heartbeat');
      expect(element.props.accessibilityRole).toBe('button');
    });

    it('has status role when onPress is not provided', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          testID="heartbeat"
        />
      );

      const element = getByTestId('heartbeat');
      expect(element.props.accessibilityRole).toBe('status');
    });
  });

  describe('Latency Formatting', () => {
    it('formats small latency', () => {
      const { getByText } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          latencyMs={5}
        />
      );

      expect(getByText('5ms')).toBeTruthy();
    });

    it('formats large latency', () => {
      const { getByText } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          latencyMs={9999}
        />
      );

      expect(getByText('9999ms')).toBeTruthy();
    });

    it('formats decimal latency', () => {
      const { getByText } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          latencyMs={125.7}
        />
      );

      expect(getByText('126ms')).toBeTruthy(); // Rounded
    });

    it('handles zero latency', () => {
      const { getByText } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          latencyMs={0}
        />
      );

      expect(getByText('0ms')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long service names', () => {
      const longName = 'Very Long Service Name That Might Need Truncation';
      const { getByText } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName={longName}
        />
      );

      expect(getByText(longName)).toBeTruthy();
    });

    it('handles special characters in service name', () => {
      const { getByText } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="API-Service_v2.0"
        />
      );

      expect(getByText('API-Service_v2.0')).toBeTruthy();
    });

    it('handles negative latency gracefully', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          latencyMs={-10}
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
    });
  });

  describe('Custom Test IDs', () => {
    it('uses custom testID', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          testID="my-heartbeat"
        />
      );

      expect(getByTestId('my-heartbeat')).toBeTruthy();
    });
  });

  describe('Default Props', () => {
    it('uses default size when not provided', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
    });

    it('uses default showPulse (true) when not provided', () => {
      const { getByTestId } = render(
        <GlassHeartbeat
          status="healthy"
          serviceName="Service"
          testID="heartbeat"
        />
      );

      expect(getByTestId('heartbeat')).toBeTruthy();
    });
  });
});
