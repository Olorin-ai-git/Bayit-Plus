/**
 * Voice Waveform
 * Audio visualization component for voice interactions
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { isTV } from '../../utils/platform';
import { VoiceState } from '../../stores/supportStore';

interface VoiceWaveformProps {
  state: VoiceState;
  audioLevel?: number; // 0-1
  barCount?: number;
}

interface AnimatedBarProps {
  index: number;
  isActive: boolean;
  audioLevel: number;
  delay: number;
}

const AnimatedBar: React.FC<AnimatedBarProps> = ({
  index,
  isActive,
  audioLevel,
  delay,
}) => {
  const heightAnim = useRef(new Animated.Value(0.2)).current;
  const baseHeight = isTV ? 60 : 40;

  useEffect(() => {
    if (isActive) {
      // Create random-ish movement based on index
      const minHeight = 0.2;
      const maxHeight = 0.3 + (audioLevel * 0.7);

      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(heightAnim, {
            toValue: maxHeight * (0.5 + Math.random() * 0.5),
            duration: 200 + (index % 3) * 100,
            delay,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: false,
          }),
          Animated.timing(heightAnim, {
            toValue: minHeight + Math.random() * 0.2,
            duration: 200 + ((index + 1) % 3) * 100,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: false,
          }),
        ])
      );
      animation.start();

      return () => animation.stop();
    } else {
      // Animate to idle state
      Animated.timing(heightAnim, {
        toValue: 0.2,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isActive, audioLevel, index, delay, heightAnim]);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height: heightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [baseHeight * 0.2, baseHeight],
          }),
          backgroundColor: isActive ? colors.primary : colors.textSecondary,
          opacity: isActive ? 1 : 0.5,
        },
      ]}
    />
  );
};

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  state,
  audioLevel = 0.5,
  barCount = 9,
}) => {
  const isActive = state === 'listening' || state === 'speaking';

  // Create bar indices
  const bars = Array.from({ length: barCount }, (_, i) => i);

  // Calculate bar colors based on state
  const getBarStyle = () => {
    switch (state) {
      case 'listening':
        return { backgroundColor: colors.success };
      case 'speaking':
        return { backgroundColor: colors.primary };
      case 'processing':
        return { backgroundColor: colors.warning };
      default:
        return { backgroundColor: colors.textSecondary };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.waveformContainer}>
        {bars.map((index) => (
          <AnimatedBar
            key={index}
            index={index}
            isActive={isActive}
            audioLevel={audioLevel}
            delay={index * 50}
          />
        ))}
      </View>

      {/* Center circle indicator */}
      {state === 'processing' && (
        <ProcessingIndicator />
      )}
    </View>
  );
};

const ProcessingIndicator: React.FC = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const scale = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    rotate.start();
    scale.start();

    return () => {
      rotate.stop();
      scale.stop();
    };
  }, [rotateAnim, scaleAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.processingIndicator,
        {
          transform: [{ rotate: spin }, { scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.processingInner} />
    </Animated.View>
  );
};

// Alternative circular waveform for avatar
export const CircularWaveform: React.FC<VoiceWaveformProps> = ({
  state,
  audioLevel = 0.5,
}) => {
  const isActive = state === 'listening' || state === 'speaking';
  const ringAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  useEffect(() => {
    if (isActive) {
      const animations = ringAnims.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1 + (audioLevel * 0.3) + (index * 0.1),
              duration: 600 + (index * 200),
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 1,
              duration: 600 + (index * 200),
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        )
      );

      animations.forEach((anim) => anim.start());

      return () => animations.forEach((anim) => anim.stop());
    } else {
      ringAnims.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [isActive, audioLevel, ringAnims]);

  const getColor = () => {
    switch (state) {
      case 'listening':
        return colors.success;
      case 'speaking':
        return colors.primary;
      case 'processing':
        return colors.warning;
      case 'error':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const baseSize = isTV ? 120 : 80;
  const color = getColor();

  return (
    <View style={styles.circularContainer}>
      {ringAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.ring,
            {
              width: baseSize + (index * 20),
              height: baseSize + (index * 20),
              borderRadius: (baseSize + (index * 20)) / 2,
              borderColor: color,
              opacity: isActive ? 0.6 - (index * 0.15) : 0.2,
              transform: [{ scale: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTV ? spacing.sm : spacing.xs,
    height: isTV ? 80 : 60,
  },
  bar: {
    width: isTV ? 6 : 4,
    borderRadius: isTV ? 3 : 2,
  },
  processingIndicator: {
    position: 'absolute',
    width: isTV ? 60 : 40,
    height: isTV ? 60 : 40,
    borderRadius: isTV ? 30 : 20,
    borderWidth: 3,
    borderColor: colors.warning,
    borderTopColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingInner: {
    width: isTV ? 30 : 20,
    height: isTV ? 30 : 20,
    borderRadius: isTV ? 15 : 10,
    backgroundColor: colors.warning,
    opacity: 0.3,
  },
  circularContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
});

export default VoiceWaveform;
