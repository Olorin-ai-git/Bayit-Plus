/**
 * Age Slider - Interactive slider for age limit selection.
 *
 * Supports:
 * - Kids age range (0-12 years)
 * - Youngsters age range (12-17 years)
 * - Visual feedback with current value display
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface AgeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const AgeSlider: React.FC<AgeSliderProps> = ({
  label,
  value,
  min,
  max,
  onChange,
  disabled = false,
}) => {
  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{value} years</Text>
        </View>
      </View>

      <Slider
        style={styles.slider}
        value={value}
        onValueChange={onChange}
        minimumValue={min}
        maximumValue={max}
        step={1}
        minimumTrackTintColor="#A855F7"
        maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
        thumbTintColor="#A855F7"
        disabled={disabled}
      />

      <View style={styles.range}>
        <Text style={styles.rangeText}>{min}</Text>
        <Text style={styles.rangeText}>{max}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  badge: {
    backgroundColor: '#A855F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  range: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rangeText: {
    fontSize: 12,
    color: '#888',
  },
});
