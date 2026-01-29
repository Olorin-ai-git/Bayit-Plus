/**
 * GlassRadar Component - SVG-based Radar Visualization
 *
 * Displays services/agents as concentric rings with anomalies/alerts
 * as blips. Features scanning ray animation and interactive anomaly selection.
 */

import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';
import { colors } from '../../../theme';
import { useRadarAnimation } from '../../../hooks/useRadarAnimation';
import type { GlassRadarProps, RadarAnomaly } from './types';
import { RADAR_CENTER } from './utils';

/**
 * Main radar visualization component
 */
export const GlassRadar: React.FC<GlassRadarProps> = ({
  agents = [],
  anomalies = [],
  uiState = { isScanning: false, showLabels: true },
  size = 700,
  onAnomalySelected,
  testID,
}) => {
  const center = size / 2;

  // Animation hook
  const animation = useRadarAnimation({
    isScanning: uiState.isScanning
  });

  // Calculate max radius
  const maxRadius = useMemo(() => {
    if (agents.length === 0) return size * 0.4;
    return Math.max(...agents.map((a) => a.radius)) + 50;
  }, [agents, size]);

  // Determine glowing anomalies
  const glowingAnomalies = useMemo(() => {
    const glowing = new Set<string>();
    if (animation.isAnimating) {
      anomalies.forEach((anomaly) => {
        const toolAngle = Math.atan2(
          anomaly.position.y - center,
          anomaly.position.x - center
        );

        if (animation.isAnomalyGlowing(toolAngle)) {
          glowing.add(anomaly.id);
        }
      });
    }
    return glowing;
  }, [anomalies, animation.isAnimating, animation.scanAngle, center]);

  return (
    <View style={[styles.container, { width: size, height: size }]} testID={testID}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={maxRadius}
          fill="none"
          stroke={colors.glassBorder}
          strokeWidth={2}
          opacity={0.3}
        />

        {/* Agent rings */}
        {agents.map((agent, index) => (
          <Circle
            key={agent.id}
            cx={center}
            cy={center}
            r={agent.radius}
            fill="none"
            stroke={agent.color || colors.primary}
            strokeWidth={2}
            opacity={0.6}
          />
        ))}

        {/* Anomaly blips */}
        {anomalies.map((anomaly) => {
          const isGlowing = glowingAnomalies.has(anomaly.id);
          const severityColor =
            anomaly.severity === 'critical' ? colors.error :
            anomaly.severity === 'high' ? '#ef4444' :
            anomaly.severity === 'medium' ? colors.warning :
            colors.info;

          return (
            <G key={anomaly.id}>
              <Circle
                cx={anomaly.position.x}
                cy={anomaly.position.y}
                r={isGlowing ? 8 : 6}
                fill={severityColor}
                opacity={isGlowing ? 1 : 0.7}
                onPress={() => onAnomalySelected?.(anomaly)}
              />
              {isGlowing && (
                <Circle
                  cx={anomaly.position.x}
                  cy={anomaly.position.y}
                  r={12}
                  fill="none"
                  stroke={severityColor}
                  strokeWidth={2}
                  opacity={0.5}
                />
              )}
            </G>
          );
        })}

        {/* Scanning ray */}
        {uiState.isScanning && (
          <Line
            x1={center}
            y1={center}
            x2={center + Math.cos(animation.scanAngle) * maxRadius}
            y2={center + Math.sin(animation.scanAngle) * maxRadius}
            stroke={colors.primary}
            strokeWidth={2}
            opacity={0.6}
          />
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(6, 16, 30, 0.8)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});

export default GlassRadar;
