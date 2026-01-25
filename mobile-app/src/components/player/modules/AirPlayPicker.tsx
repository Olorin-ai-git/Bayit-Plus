/**
 * AirPlay Picker Component
 * Native iOS AVRoutePickerView wrapper for React Native
 */

import React from 'react'
import { requireNativeComponent, StyleSheet, ViewStyle, Platform } from 'react-native'

interface AirPlayPickerProps {
  style?: ViewStyle
}

// Import the native module
const NativeAirPlayPicker = Platform.OS === 'ios'
  ? requireNativeComponent<AirPlayPickerProps>('AirPlayPicker')
  : null

export default function AirPlayPicker({ style }: AirPlayPickerProps) {
  if (Platform.OS !== 'ios' || !NativeAirPlayPicker) {
    return null
  }

  return <NativeAirPlayPicker style={[styles.picker, style]} />
}

const styles = StyleSheet.create({
  picker: {
    width: 40,
    height: 40,
  },
})
