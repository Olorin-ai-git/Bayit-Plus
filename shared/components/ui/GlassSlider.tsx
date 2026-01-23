/**
 * GlassSlider Component
 *
 * A cross-platform slider with glassmorphism styling.
 * Supports web, iOS, tvOS, and Android platforms.
 */

import { useState, useCallback, useRef } from 'react'
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  GestureResponderEvent,
  LayoutChangeEvent,
  AccessibilityInfo,
} from 'react-native'
import { colors, borderRadius } from '../../theme'
import { isTV } from '../../utils/platform'
import { useTVFocus } from '../hooks/useTVFocus'

const MIN_TOUCH_TARGET = 44
const TV_TOUCH_TARGET = 56

export interface GlassSliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number) => void
  disabled?: boolean
  accessibilityLabel?: string
  testID?: string
}

export function GlassSlider({
  value,
  min = 0,
  max = 1,
  step = 0.1,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  testID,
}: GlassSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const { isFocused, handleFocus, handleBlur, focusStyle } = useTVFocus({ styleType: 'card' })

  // Calculate percentage from value
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  // Handle track layout to get width
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width)
  }, [])

  // Calculate value from touch/click position
  const calculateValue = useCallback(
    (locationX: number) => {
      if (trackWidth === 0) return value
      const ratio = Math.max(0, Math.min(1, locationX / trackWidth))
      const rawValue = min + ratio * (max - min)
      // Round to step
      const steppedValue = Math.round(rawValue / step) * step
      return Math.max(min, Math.min(max, steppedValue))
    },
    [trackWidth, min, max, step, value]
  )

  // Handle press on track
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled) return
      const locationX = event.nativeEvent.locationX
      const newValue = calculateValue(locationX)
      onValueChange?.(newValue)
      announceValue(newValue)
    },
    [disabled, calculateValue, onValueChange]
  )

  // Handle drag start
  const handleMoveStart = useCallback(() => {
    if (disabled) return
    setIsDragging(true)
  }, [disabled])

  // Handle drag move
  const handleMove = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled || !isDragging) return
      const locationX = event.nativeEvent.locationX
      const newValue = calculateValue(locationX)
      onValueChange?.(newValue)
    },
    [disabled, isDragging, calculateValue, onValueChange]
  )

  // Handle drag end
  const handleMoveEnd = useCallback(() => {
    setIsDragging(false)
    announceValue(value)
  }, [value])

  // Screen reader announcement
  const announceValue = useCallback((val: number) => {
    const percent = Math.round(((val - min) / (max - min)) * 100)
    if (Platform.OS !== 'web') {
      AccessibilityInfo.announceForAccessibility(`${percent}%`)
    }
  }, [min, max])

  // TV remote key handling (left/right arrows)
  const handleKeyDown = useCallback(
    (event: any) => {
      if (disabled || !isFocused) return
      const keyStep = step * 2 // Larger steps for TV remote

      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault()
        const newValue = Math.min(max, value + keyStep)
        onValueChange?.(newValue)
        announceValue(newValue)
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault()
        const newValue = Math.max(min, value - keyStep)
        onValueChange?.(newValue)
        announceValue(newValue)
      }
    },
    [disabled, isFocused, step, max, min, value, onValueChange, announceValue]
  )

  return (
    <Pressable
      onLayout={handleLayout}
      onPress={handlePress}
      onPressIn={handleMoveStart}
      onPressOut={handleMoveEnd}
      onMoveShouldSetResponder={() => true}
      onResponderMove={handleMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={Platform.OS === 'web' ? handleKeyDown : undefined}
      focusable={!disabled}
      disabled={disabled}
      testID={testID}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min,
        max,
        now: value,
      }}
      style={[
        styles.container,
        isTV && styles.containerTV,
        isFocused && focusStyle,
        disabled && styles.containerDisabled,
      ]}
    >
      <View style={[styles.track, isTV && styles.trackTV]}>
        <View
          style={[
            styles.fill,
            { width: `${percentage}%` },
            isDragging && styles.fillDragging,
          ]}
        />
        <View
          style={[
            styles.thumb,
            isTV && styles.thumbTV,
            { left: `${percentage}%` },
            isDragging && styles.thumbDragging,
          ]}
        />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    height: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  containerTV: {
    height: TV_TOUCH_TARGET,
    paddingHorizontal: 12,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  track: {
    height: 6,
    backgroundColor: colors.glassLight,
    borderRadius: borderRadius.sm,
    position: 'relative',
    overflow: 'visible',
  },
  trackTV: {
    height: 8,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  fillDragging: {
    backgroundColor: colors.primaryLight,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.text,
    marginLeft: -8,
    marginTop: -8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbTV: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    marginTop: -10,
  },
  thumbDragging: {
    transform: [{ scale: 1.2 }],
    backgroundColor: colors.primary,
  },
})

export default GlassSlider
