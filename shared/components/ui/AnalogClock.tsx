import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme';

export interface AnalogClockProps {
  hours: number;
  minutes: number;
  size?: number;
  label?: string;
  flag?: string;
  sublabel?: string;
  accentColor?: string;
  isShabbat?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * AnalogClock Component
 * Renders an analog clock face with hour and minute hands
 * Shared between web and TV apps
 */
export const AnalogClock: React.FC<AnalogClockProps> = ({
  hours,
  minutes,
  size = 120,
  label,
  flag,
  sublabel,
  accentColor = colors.primary,
  isShabbat = false,
  style,
}) => {
  // Calculate hand rotations
  const hourRotation = ((hours % 12) + minutes / 60) * 30; // 30 degrees per hour
  const minuteRotation = minutes * 6; // 6 degrees per minute

  const clockRadius = size / 2;
  const hourHandLength = clockRadius * 0.5;
  const minuteHandLength = clockRadius * 0.7;
  const centerDotSize = size * 0.08;

  // Generate hour markers
  const hourMarkers = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const isMainHour = i % 3 === 0;
    const markerLength = isMainHour ? 8 : 4;
    const outerRadius = clockRadius - 4;

    hourMarkers.push(
      <View
        key={i}
        style={[
          styles.hourMarker,
          {
            width: isMainHour ? 3 : 2,
            height: markerLength,
            backgroundColor: isMainHour ? colors.text : colors.glassBorderWhite,
            position: 'absolute',
            left: clockRadius + Math.cos(angle) * (outerRadius - markerLength / 2) - (isMainHour ? 1.5 : 1),
            top: clockRadius + Math.sin(angle) * (outerRadius - markerLength / 2) - markerLength / 2,
            transform: [{ rotate: `${i * 30}deg` }],
          },
        ]}
      />
    );
  }

  return (
    <View style={[styles.analogClockContainer, style]}>
      {/* Clock Face */}
      <View
        style={[
          styles.clockFace,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: accentColor,
          },
        ]}
      >
        {/* Hour markers */}
        {hourMarkers}

        {/* Hour Hand */}
        <View
          style={[
            styles.clockHand,
            styles.hourHand,
            {
              width: 4,
              height: hourHandLength,
              backgroundColor: colors.text,
              left: clockRadius - 2,
              top: clockRadius - hourHandLength,
              transformOrigin: 'center bottom',
              transform: [{ rotate: `${hourRotation}deg` }],
            },
          ]}
        />

        {/* Minute Hand */}
        <View
          style={[
            styles.clockHand,
            styles.minuteHand,
            {
              width: 2,
              height: minuteHandLength,
              backgroundColor: accentColor,
              left: clockRadius - 1,
              top: clockRadius - minuteHandLength,
              transformOrigin: 'center bottom',
              transform: [{ rotate: `${minuteRotation}deg` }],
            },
          ]}
        />

        {/* Center Dot */}
        <View
          style={[
            styles.centerDot,
            {
              width: centerDotSize,
              height: centerDotSize,
              borderRadius: centerDotSize / 2,
              backgroundColor: accentColor,
              left: clockRadius - centerDotSize / 2,
              top: clockRadius - centerDotSize / 2,
            },
          ]}
        />

        {/* Shabbat indicator */}
        {isShabbat && (
          <View style={styles.shabbatIndicator}>
            <Text style={styles.shabbatStar}>✡</Text>
          </View>
        )}
      </View>

      {/* Label */}
      {(label || flag) && (
        <View style={styles.clockLabelContainer}>
          <View style={styles.clockLabelRow}>
            {flag && <Text style={styles.clockFlag}>{flag}</Text>}
            {label && <Text style={[styles.clockLabel, { color: accentColor }]}>{label}</Text>}
          </View>
          {sublabel && <Text style={styles.clockSublabel}>{sublabel}</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  analogClockContainer: {
    alignItems: 'center',
  },
  clockFace: {
    backgroundColor: colors.glassOverlay,
    borderWidth: 3,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hourMarker: {
    borderRadius: 1,
  },
  clockHand: {
    position: 'absolute',
    borderRadius: 2,
  },
  hourHand: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  minuteHand: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  centerDot: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  shabbatIndicator: {
    position: 'absolute',
    top: '60%',
    left: '50%',
    transform: [{ translateX: -8 }, { translateY: -8 }],
  },
  shabbatStar: {
    fontSize: 16,
    color: '#F59E0B', // warning color
  },
  clockLabelContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  clockLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clockFlag: {
    fontSize: 18,
  },
  clockLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  clockSublabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default AnalogClock;
