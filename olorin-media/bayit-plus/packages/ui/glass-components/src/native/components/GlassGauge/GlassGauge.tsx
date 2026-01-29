/**
 * GlassGauge Component - SVG-based Circular Gauge
 *
 * High-fidelity circular gauge with spring needle animation
 * and risk zone visualization.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../../../theme';
import { useSpringAnimation } from '../../../hooks/useSpringAnimation';
import type { GlassGaugeProps } from './types';
import { valueToAngle, arcPath, polarToCartesian } from './utils';

const START_ANGLE = -120;
const END_ANGLE = 120;

/**
 * Circular gauge with needle and risk zones
 */
export const GlassGauge: React.FC<GlassGaugeProps> = ({
  value,
  max,
  label,
  color,
  showZones = false,
  zones = [],
  size = 280,
  testID,
}) => {
  // Validate inputs
  const validValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const validMax = Number.isFinite(max) && max > 0 ? max : 100;

  // Spring animation for needle
  const animValue = useSpringAnimation(validValue);

  // Geometry calculations
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.4;
  const needleLen = radius * 0.96;
  const currentAngle = valueToAngle(animValue, validMax, START_ANGLE, END_ANGLE);
  const angleRad = (currentAngle - 90) * (Math.PI / 180);
  const nx = cx + Math.cos(angleRad) * needleLen;
  const ny = cy + Math.sin(angleRad) * needleLen;

  // Generate tick marks
  const ticks = useMemo(() => {
    const totalTicks = 40;
    const items = [];

    for (let i = 0; i <= totalTicks; i++) {
      const t = i / totalTicks;
      const a = START_ANGLE + (END_ANGLE - START_ANGLE) * t;
      const rad = (a - 90) * (Math.PI / 180);
      const thick = i % 4 === 0;
      const r1 = radius * (thick ? 1.1 : 1.05);
      const r2 = radius * (thick ? 0.9 : 0.96);
      const x1 = cx + Math.cos(rad) * r1;
      const y1 = cy + Math.sin(rad) * r1;
      const x2 = cx + Math.cos(rad) * r2;
      const y2 = cy + Math.sin(rad) * r2;

      items.push({ x1, y1, x2, y2, thick });
    }

    return items;
  }, [cx, cy, radius]);

  const display = Math.round(validValue);
  const fillPath = arcPath(cx, cy, radius, START_ANGLE, currentAngle);

  return (
    <View style={[styles.container, { width: size, height: size }]} testID={testID}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="bezelGrad" cx="50%" cy="50%" r="70%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
            <Stop offset="55%" stopColor="#222a3a" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.85" />
          </RadialGradient>
        </Defs>

        {/* Background */}
        <Circle cx={cx} cy={cy} r={size * 0.49} fill="#070b14" />
        <Circle cx={cx} cy={cy} r={size * 0.49} fill="url(#bezelGrad)" />

        {/* Track */}
        <Path
          d={arcPath(cx, cy, radius, START_ANGLE, END_ANGLE)}
          stroke="#0b1220"
          strokeWidth={size * 0.1}
          fill="none"
          opacity={0.95}
        />

        {/* Value fill */}
        <Path
          d={fillPath}
          stroke={color}
          strokeWidth={size * 0.08}
          strokeLinecap="round"
          fill="none"
          opacity={0.8}
        />

        {/* Risk zones */}
        {showZones && zones.map((z, i) => (
          <Path
            key={i}
            d={arcPath(
              cx,
              cy,
              radius,
              valueToAngle(z.start, validMax, START_ANGLE, END_ANGLE),
              valueToAngle(z.end, validMax, START_ANGLE, END_ANGLE)
            )}
            stroke={z.color}
            strokeWidth={size * 0.065}
            strokeLinecap="round"
            fill="none"
            opacity={0.6}
          />
        ))}

        {/* Ticks */}
        {ticks.map((t, i) => (
          <Line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#a9b5cc"
            strokeWidth={t.thick ? 2 : 1}
            opacity={t.thick ? 0.9 : 0.6}
          />
        ))}

        {/* Needle */}
        <Line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={color}
          strokeWidth={3.5}
        />
        <Circle cx={cx} cy={cy} r={7} fill={color} />
        <Circle cx={cx} cy={cy} r={11} fill="#0b1220" stroke="#2a3347" strokeWidth={2.5} />
        <Circle cx={cx} cy={cy} r={5} fill="#0b1220" stroke="#435068" strokeWidth={1.5} />
      </Svg>

      {/* Value label */}
      <View style={styles.labelContainer}>
        <Text style={[styles.value, { color }]}>{display}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  labelContainer: {
    position: 'absolute',
    top: '60%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
  },
  label: {
    fontSize: 14,
    color: '#b6c2d9',
    opacity: 0.85,
    marginTop: 4,
  },
});

export default GlassGauge;
