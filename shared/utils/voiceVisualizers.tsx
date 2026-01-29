/**
 * Voice Visualizer Components
 * Shared visual indicators for voice states (listening, processing, speaking)
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '@olorin/design-tokens';
import { VoiceState } from '../stores/supportStore';

// ============================================================================
// Waveform Visualizer (listening state)
// ============================================================================

interface WaveformVisualizerProps {
  audioLevel: number;
  compact?: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  audioLevel,
  compact = false,
}) => {
  const barCount = compact ? 8 : 12;
  const bars = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    const animations = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 0.3 + audioLevel * 0.7,
            duration: 200 + index * 50,
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 0.3,
            duration: 200 + index * 50,
            useNativeDriver: false,
          }),
        ])
      )
    );

    Animated.parallel(animations).start();
  }, [audioLevel, bars]);

  return (
    <View style={styles.waveform}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveformBar,
            {
              height: bar.interpolate({
                inputRange: [0, 1],
                outputRange: [compact ? 8 : 12, compact ? 32 : 40],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};

// ============================================================================
// Processing Indicator (thinking/processing state)
// ============================================================================

interface ProcessingIndicatorProps {
  compact?: boolean;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ compact = false }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);

  const rotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.processingSpinner}>
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        <View style={[styles.spinnerDot, compact && styles.spinnerDotCompact]} />
      </Animated.View>
    </View>
  );
};

// ============================================================================
// Speaking Indicator (speaking/TTS state)
// ============================================================================

interface SpeakingIndicatorProps {
  compact?: boolean;
}

export const SpeakingIndicator: React.FC<SpeakingIndicatorProps> = ({ compact = false }) => {
  return (
    <View style={styles.speakingIndicator}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.speakingDot, compact && styles.speakingDotCompact]} />
      ))}
    </View>
  );
};

// ============================================================================
// Helper Function: Get color for voice state
// ============================================================================

export function getStateColor(state: VoiceState): string {
  switch (state) {
    case 'listening':
      return colors.blue[500];
    case 'processing':
      return colors.purple[500];
    case 'speaking':
      return colors.green[500];
    case 'error':
      return colors.red[500];
    case 'idle':
    default:
      return colors.gray[400];
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Waveform
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
  },
  waveformBar: {
    width: 4,
    backgroundColor: colors.purple[500],
    borderRadius: 2,
  },

  // Processing
  processingSpinner: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.purple[500],
  },
  spinnerDotCompact: {
    width: 6,
    height: 6,
  },

  // Speaking
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speakingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green[500],
  },
  speakingDotCompact: {
    width: 6,
    height: 6,
  },
});
