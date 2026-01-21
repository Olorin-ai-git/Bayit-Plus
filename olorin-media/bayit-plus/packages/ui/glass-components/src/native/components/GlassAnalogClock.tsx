/**
 * GlassAnalogClock Component
 *
 * Renders an analog clock face with hour and minute hands.
 * Features glassmorphic styling and optional Shabbat indicator.
 * Shared between web and native apps.
 */

import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../theme';

export interface GlassAnalogClockProps {
  /** Hours (0-23 or 0-12) */
  hours: number;
  /** Minutes (0-59) */
  minutes: number;
  /** Clock size in pixels */
  size?: number;
  /** Label text below clock */
  label?: string;
  /** Flag emoji to display */
  flag?: string;
  /** Sublabel text below label */
  sublabel?: string;
  /** Accent color for minute hand and border */
  accentColor?: string;
  /** Show Shabbat indicator */
  isShabbat?: boolean;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic analog clock component
 */
export const GlassAnalogClock: React.FC<GlassAnalogClockProps> = ({
  hours,
  minutes,
  size = 120,
  label,
  flag,
  sublabel,
  accentColor = colors.primary,
  isShabbat = false,
  style,
  testID,
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
        className="rounded-sm absolute"
        style={{
          width: isMainHour ? 3 : 2,
          height: markerLength,
          backgroundColor: isMainHour ? colors.text : colors.glassBorderWhite,
          left: clockRadius + Math.cos(angle) * (outerRadius - markerLength / 2) - (isMainHour ? 1.5 : 1),
          top: clockRadius + Math.sin(angle) * (outerRadius - markerLength / 2) - markerLength / 2,
          transform: [{ rotate: `${i * 30}deg` }],
        }}
      />
    );
  }

  return (
    <View className="items-center" style={style} testID={testID}>
      {/* Clock Face */}
      <View
        className="relative justify-center items-center border-[3px]"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: accentColor,
          backgroundColor: colors.glassOverlay,
        }}
      >
        {/* Hour markers */}
        {hourMarkers}

        {/* Hour Hand */}
        <View
          className="absolute rounded-sm"
          style={{
            width: 4,
            height: hourHandLength,
            backgroundColor: colors.text,
            left: clockRadius - 2,
            top: clockRadius - hourHandLength,
            transformOrigin: 'center bottom',
            transform: [{ rotate: `${hourRotation}deg` }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 1,
          }}
        />

        {/* Minute Hand */}
        <View
          className="absolute rounded-sm"
          style={{
            width: 2,
            height: minuteHandLength,
            backgroundColor: accentColor,
            left: clockRadius - 1,
            top: clockRadius - minuteHandLength,
            transformOrigin: 'center bottom',
            transform: [{ rotate: `${minuteRotation}deg` }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
          }}
        />

        {/* Center Dot */}
        <View
          className="absolute"
          style={{
            width: centerDotSize,
            height: centerDotSize,
            borderRadius: centerDotSize / 2,
            backgroundColor: accentColor,
            left: clockRadius - centerDotSize / 2,
            top: clockRadius - centerDotSize / 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
          }}
        />

        {/* Shabbat indicator */}
        {isShabbat && (
          <View className="absolute" style={{ top: '60%', left: '50%', transform: [{ translateX: -8 }, { translateY: -8 }] }}>
            <Text className="text-base" style={{ color: '#F59E0B' }}>✡</Text>
          </View>
        )}
      </View>

      {/* Label */}
      {(label || flag) && (
        <View className="mt-3 items-center">
          <View className="flex-row items-center gap-1">
            {flag && <Text className="text-lg">{flag}</Text>}
            {label && <Text className="text-sm font-semibold" style={{ color: accentColor }}>{label}</Text>}
          </View>
          {sublabel && <Text className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>{sublabel}</Text>}
        </View>
      )}
    </View>
  );
};

export default GlassAnalogClock;
