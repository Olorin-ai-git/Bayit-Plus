/**
 * VoiceWaveform - Animated audio waveform for voice feedback
 *
 * Features:
 * - Real-time audio amplitude visualization
 * - Reactive to voice input
 * - Glass morphism styling
 * - Smooth animations with React Native Reanimated
 */

import React, { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import { colors } from '@olorin/design-tokens';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface VoiceWaveformProps {
  isListening: boolean;
  amplitude?: number; // 0-1 scale, from audio input
  barCount?: number;
  color?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const DEFAULT_BAR_COUNT = 5;
const BAR_WIDTH = 4;
const BAR_SPACING = 8;
const MIN_HEIGHT = 20;
const MAX_HEIGHT = 80;

export default function VoiceWaveform({
  isListening,
  amplitude = 0.5,
  barCount = DEFAULT_BAR_COUNT,
  color = colors.info.DEFAULT,
}: VoiceWaveformProps) {
  // Create shared values for each bar
  const barAnimations = Array.from({ length: barCount }, () => useSharedValue(0));

  // Start/stop animations based on listening state
  useEffect(() => {
    if (isListening) {
      // Start animations for each bar with slight delay
      barAnimations.forEach((anim, index) => {
        anim.value = withRepeat(
          withSequence(
            withTiming(1, {
              duration: 300 + index * 50,
              easing: Easing.ease,
            }),
            withTiming(0, {
              duration: 300 + index * 50,
              easing: Easing.ease,
            })
          ),
          -1, // Infinite repeat
          false
        );
      });
    } else {
      // Reset all bars to minimum height
      barAnimations.forEach((anim) => {
        anim.value = withTiming(0, { duration: 200 });
      });
    }
  }, [isListening]);

  // Render individual bar
  const renderBar = (index: number) => {
    const animatedStyle = useAnimatedStyle(() => {
      // Interpolate animation value to height
      const baseHeight = interpolate(
        barAnimations[index].value,
        [0, 1],
        [MIN_HEIGHT, MAX_HEIGHT]
      );

      // Apply amplitude scaling
      const scaledHeight = MIN_HEIGHT + (baseHeight - MIN_HEIGHT) * amplitude;

      return {
        height: scaledHeight,
        opacity: isListening ? interpolate(barAnimations[index].value, [0, 1], [0.4, 1]) : 0.3,
      };
    });

    return (
      <Animated.View
        key={index}
        className="rounded-sm"
        style={[
          {
            backgroundColor: color,
            width: BAR_WIDTH,
          },
          animatedStyle,
        ]}
      />
    );
  };

  return (
    <View className="items-center justify-center">
      <View className="flex-row items-center justify-center gap-2 py-5">
        {Array.from({ length: barCount }).map((_, index) => renderBar(index))}
      </View>
    </View>
  );
}
