/**
 * TV Voice Waveform Component
 * Standalone waveform visualization for audio levels
 * Animates based on microphone input
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
} from 'react-native';

interface TVVoiceWaveformProps {
  audioLevel?: number;
  isListening?: boolean;
  barCount?: number;
  height?: number;
  color?: string;
}

export const TVVoiceWaveform: React.FC<TVVoiceWaveformProps> = ({
  audioLevel = 0,
  isListening = false,
  barCount = 12,
  height = 60,
  color = '#A855F7',
}) => {
  const animRefs = useRef<Animated.Value[]>([]);

  // Initialize animation values for each bar
  useEffect(() => {
    if (animRefs.current.length === 0) {
      animRefs.current = Array.from({ length: barCount }, () =>
        new Animated.Value(0.2)
      );
    }
  }, [barCount]);

  // Animate bars based on audio level
  useEffect(() => {
    if (!isListening) {
      // Reset animation when not listening
      Animated.parallel(
        animRefs.current.map((anim) =>
          Animated.timing(anim, {
            toValue: 0.2,
            duration: 200,
            useNativeDriver: false,
          })
        )
      ).start();
      return;
    }

    // Animate bars based on audio level
    const animations = animRefs.current.map((anim, index) => {
      // Add some variation between bars
      const variation = 0.2 + Math.sin(index * 0.5) * 0.1;
      const targetValue = Math.max(0.2, audioLevel * (1 + variation));

      return Animated.timing(anim, {
        toValue: targetValue,
        duration: 100,
        useNativeDriver: false,
      });
    });

    Animated.parallel(animations).start();
  }, [audioLevel, isListening, barCount]);

  return (
    <View style={[styles.container, { height }]}>
      {animRefs.current.map((animValue, index) => {
        const heightInterpolation = animValue.interpolate({
          inputRange: [0.2, 1],
          outputRange: [height * 0.3, height],
        });

        return (
          <Animated.View
            key={`bar-${index}`}
            style={[
              styles.bar,
              {
                height: heightInterpolation,
                backgroundColor: color,
                opacity: isListening ? 0.8 : 0.4,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 8,
    gap: 4,
  },
  bar: {
    width: 6,
    borderRadius: 3,
    minHeight: 4,
  },
});

export default TVVoiceWaveform;
