/**
 * tvos-app Shim: @react-native-community/slider
 *
 * Provides a basic Slider component for tvOS where the native
 * community slider package is not installed. Used by shared
 * family-controls AgeSlider component.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

interface SliderProps {
  value?: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  disabled?: boolean;
  style?: any;
}

/**
 * Shim slider for tvOS - renders a track bar.
 * tvOS uses focus-based navigation so a native slider isn't interactive
 * in the same way; this renders the visual representation.
 */
const Slider: React.FC<SliderProps> = ({
  value = 0,
  minimumValue = 0,
  maximumValue = 1,
  minimumTrackTintColor = '#A855F7',
  maximumTrackTintColor = 'rgba(255,255,255,0.2)',
  style,
}) => {
  const range = maximumValue - minimumValue;
  const fillPercent = range > 0 ? ((value - minimumValue) / range) * 100 : 0;

  return (
    <View style={[styles.track, style, { backgroundColor: maximumTrackTintColor }]}>
      <View
        style={[
          styles.fill,
          { width: `${fillPercent}%`, backgroundColor: minimumTrackTintColor },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default Slider;
