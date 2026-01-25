/**
 * SoundwaveVisualizer Component
 *
 * Displays animated soundwave bars in the topbar for constant listening mode.
 * Shows idle animation when listening, reacts to audio levels during speech,
 * and displays processing state when sending to API.
 */

import React, { useEffect, useRef, useMemo, memo } from 'react';
import {
  View,
  Animated,
  Easing,
  ViewStyle,
} from 'react-native';
import { colors } from '@olorin/design-tokens';

export interface AudioLevel {
  average: number;  // 0-1 normalized
  peak: number;     // 0-1 normalized
}

export interface SoundwaveVisualizerProps {
  audioLevel: AudioLevel;
  isListening: boolean;
  isProcessing: boolean;
  isSendingToServer: boolean;
  style?: ViewStyle;
  barCount?: number;
  compact?: boolean;
}

// Default to 5 bars for the visualization
const DEFAULT_BAR_COUNT = 5;

// Bar dimensions
const BAR_WIDTH = 4;
const BAR_SPACING = 3;
const BAR_MIN_HEIGHT = 4;
const BAR_MAX_HEIGHT = 28;
const COMPACT_BAR_MAX_HEIGHT = 20;

// Animation durations
const IDLE_ANIMATION_DURATION = 2000;
const ACTIVE_ANIMATION_DURATION = 100;
const PROCESSING_PULSE_DURATION = 600;

// Colors
const IDLE_COLOR = 'rgba(168, 85, 247, 0.35)';
const ACTIVE_COLOR = 'rgba(168, 85, 247, 0.85)';
const PROCESSING_COLOR = 'rgba(168, 85, 247, 0.6)';
const SENDING_INDICATOR_COLOR = '#ff4444';

/**
 * Individual animated bar component
 */
const AnimatedBar = memo(({
  index,
  audioLevel,
  isListening,
  isProcessing,
  isSendingToServer,
  barCount,
  maxHeight,
}: {
  index: number;
  audioLevel: AudioLevel;
  isListening: boolean;
  isProcessing: boolean;
  isSendingToServer: boolean;
  barCount: number;
  maxHeight: number;
}) => {
  const heightAnim = useRef(new Animated.Value(BAR_MIN_HEIGHT)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const idlePhaseOffset = useRef(Math.random() * Math.PI * 2).current;

  // Idle animation effect
  useEffect(() => {
    let animation: Animated.CompositeAnimation;

    if (isListening && !isProcessing && audioLevel.average < 0.02) {
      // Idle state - gentle sine wave animation
      const animateIdle = () => {
        const phase = (Date.now() / IDLE_ANIMATION_DURATION) * Math.PI * 2 + idlePhaseOffset;
        const idleHeight = BAR_MIN_HEIGHT + (maxHeight - BAR_MIN_HEIGHT) * 0.3 *
          (0.5 + 0.5 * Math.sin(phase + (index * Math.PI / barCount)));

        Animated.timing(heightAnim, {
          toValue: idleHeight,
          duration: 50,
          useNativeDriver: false,
          easing: Easing.linear,
        }).start();
      };

      const interval = setInterval(animateIdle, 50);
      return () => clearInterval(interval);
    } else if (isListening && isProcessing) {
      // Active state - react to audio level with variation per bar
      const barVariation = 0.7 + (Math.sin(index * Math.PI / barCount) * 0.3);
      const targetHeight = BAR_MIN_HEIGHT + (maxHeight - BAR_MIN_HEIGHT) *
        Math.min(1, audioLevel.average * 3) * barVariation;

      animation = Animated.timing(heightAnim, {
        toValue: Math.max(BAR_MIN_HEIGHT, targetHeight),
        duration: ACTIVE_ANIMATION_DURATION,
        useNativeDriver: false,
        easing: Easing.out(Easing.quad),
      });
      animation.start();
    } else if (isSendingToServer) {
      // Processing state - sequential pulse animation
      const pulseSequence = () => {
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.timing(heightAnim, {
            toValue: maxHeight,
            duration: PROCESSING_PULSE_DURATION / 2,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.sine),
          }),
          Animated.timing(heightAnim, {
            toValue: BAR_MIN_HEIGHT + 4,
            duration: PROCESSING_PULSE_DURATION / 2,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.sine),
          }),
        ]).start(({ finished }) => {
          if (finished && isSendingToServer) {
            pulseSequence();
          }
        });
      };
      pulseSequence();
    } else {
      // Not listening - reset to minimum
      Animated.timing(heightAnim, {
        toValue: BAR_MIN_HEIGHT,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isListening, isProcessing, isSendingToServer, audioLevel.average, index, barCount, maxHeight, heightAnim, idlePhaseOffset]);

  // Color animation
  useEffect(() => {
    Animated.timing(colorAnim, {
      toValue: isProcessing ? 1 : (isSendingToServer ? 2 : 0),
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isProcessing, isSendingToServer, colorAnim]);

  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [IDLE_COLOR, ACTIVE_COLOR, PROCESSING_COLOR],
  });

  return (
    <Animated.View
      className="rounded-sm"
      style={{
        height: heightAnim,
        backgroundColor,
        width: BAR_WIDTH,
        marginHorizontal: BAR_SPACING / 2,
      }}
    />
  );
});

AnimatedBar.displayName = 'AnimatedBar';

/**
 * Privacy indicator (red dot when sending to server)
 */
const PrivacyIndicator = memo(({ visible }: { visible: boolean }) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      // Pulsing animation when visible
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(opacityAnim, {
              toValue: 0.5,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 0.8,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, opacityAnim, scaleAnim]);

  return (
    <Animated.View
      className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full z-10"
      style={{
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
        backgroundColor: SENDING_INDICATOR_COLOR,
      }}
    />
  );
});

PrivacyIndicator.displayName = 'PrivacyIndicator';

/**
 * Main SoundwaveVisualizer component
 */
export const SoundwaveVisualizer: React.FC<SoundwaveVisualizerProps> = memo(({
  audioLevel,
  isListening,
  isProcessing,
  isSendingToServer,
  style,
  barCount = DEFAULT_BAR_COUNT,
  compact = false,
}) => {
  const maxHeight = compact ? COMPACT_BAR_MAX_HEIGHT : BAR_MAX_HEIGHT;

  // Create array of bar indices
  const barIndices = useMemo(() =>
    Array.from({ length: barCount }, (_, i) => i),
    [barCount]
  );

  // Calculate container width
  const containerWidth = barCount * (BAR_WIDTH + BAR_SPACING);

  return (
    <View className="relative justify-center items-center px-1" style={[{ width: containerWidth, height: maxHeight + 8 }, style]}>
      {/* Privacy indicator */}
      <PrivacyIndicator visible={isSendingToServer} />

      {/* Soundwave bars */}
      <View className="flex-row items-center justify-center h-full">
        {barIndices.map((index) => (
          <AnimatedBar
            key={index}
            index={index}
            audioLevel={audioLevel}
            isListening={isListening}
            isProcessing={isProcessing}
            isSendingToServer={isSendingToServer}
            barCount={barCount}
            maxHeight={maxHeight}
          />
        ))}
      </View>
    </View>
  );
});

SoundwaveVisualizer.displayName = 'SoundwaveVisualizer';

export default SoundwaveVisualizer;
