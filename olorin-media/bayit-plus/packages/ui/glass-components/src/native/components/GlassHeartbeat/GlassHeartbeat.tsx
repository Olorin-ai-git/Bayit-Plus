/**
 * GlassHeartbeat Component - Service Health Indicator
 *
 * Displays service status with pulsing animation for healthy services.
 * Shows service name and optional latency metrics.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { colors } from '../../../theme';
import type { GlassHeartbeatProps } from './types';
import { getStatusColor, getSizeConfig, formatLatency } from './utils';

/**
 * Service heartbeat/health indicator component
 */
export const GlassHeartbeat: React.FC<GlassHeartbeatProps> = ({
  status,
  serviceName,
  latencyMs,
  size = 'md',
  showPulse = true,
  onPress,
  testID,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sizeConfig = getSizeConfig(size);
  const statusColor = getStatusColor(status);

  useEffect(() => {
    if (status === 'healthy' && showPulse) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
      return undefined;
    }
  }, [status, showPulse, pulseAnim]);

  const content = (
    <View style={styles.container} testID={testID}>
      <Animated.View
        style={[
          styles.dot,
          {
            width: sizeConfig.dotSize,
            height: sizeConfig.dotSize,
            borderRadius: sizeConfig.dotSize / 2,
            backgroundColor: statusColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      <View style={[styles.textContainer, { marginLeft: sizeConfig.spacing }]}>
        <Text style={[styles.serviceName, { fontSize: sizeConfig.fontSize }]}>
          {serviceName}
        </Text>
        {latencyMs !== undefined && (
          <Text style={[styles.latency, { fontSize: sizeConfig.fontSize * 0.85 }]}>
            {formatLatency(latencyMs)}
          </Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  textContainer: {
    flex: 1,
  },
  serviceName: {
    color: colors.text,
    fontWeight: '600',
  },
  latency: {
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default GlassHeartbeat;
