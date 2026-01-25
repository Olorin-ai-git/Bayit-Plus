/**
 * GlassLoadingSpinner Component
 *
 * Glassmorphic loading spinner with purple glow
 * Platform-agnostic (works on web, mobile, TV)
 *
 * @module GlassLoadingSpinner
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

export interface GlassLoadingSpinnerProps {
  /** Size of the spinner in pixels */
  size?: number;
  /** Spinner color (defaults to purple) */
  color?: string;
  /** Optional custom styles */
  style?: ViewStyle;
}

/**
 * Glass-styled loading spinner
 */
export function GlassLoadingSpinner({
  size = 64,
  color = '#8b5cf6',
  style,
}: GlassLoadingSpinnerProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <div
        className="border-4 rounded-full animate-spin"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderColor: `${color}30`,
          borderTopColor: color,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GlassLoadingSpinner;
