/**
 * Voice Waveform
 * Audio visualization component for voice interactions
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Easing,
} from 'react-native';
import { colors } from '@olorin/design-tokens';
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
      className={isTV ? "w-1.5 rounded-sm" : "w-1 rounded"}
      style={{
        height: heightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [baseHeight * 0.2, baseHeight],
        }),
        backgroundColor: isActive ? colors.primary : colors.textSecondary,
        opacity: isActive ? 1 : 0.5,
      }}
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
    <View className="items-center justify-center p-4">
      <View className={`flex-row items-center justify-center ${isTV ? 'gap-2 h-20' : 'gap-1 h-15'}`}>
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
      className={`absolute ${isTV ? 'w-15 h-15' : 'w-10 h-10'} ${isTV ? 'rounded-[30px]' : 'rounded-[20px]'} border-3 justify-center items-center`}
      style={{
        borderColor: colors.warning.DEFAULT,
        borderTopColor: 'transparent',
        transform: [{ rotate: spin }, { scale: scaleAnim }],
      }}
    >
      <View className={`${isTV ? 'w-7.5 h-7.5 rounded-[15px]' : 'w-5 h-5 rounded-[10px]'} opacity-30`} style={{ backgroundColor: colors.warning }} />
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
    <View className="items-center justify-center relative">
      {ringAnims.map((anim, index) => (
        <Animated.View
          key={index}
          className="absolute border-2"
          style={{
            width: baseSize + (index * 20),
            height: baseSize + (index * 20),
            borderRadius: (baseSize + (index * 20)) / 2,
            borderColor: color,
            opacity: isActive ? 0.6 - (index * 0.15) : 0.2,
            transform: [{ scale: anim }],
          }}
        />
      ))}
    </View>
  );
};

export default VoiceWaveform;
