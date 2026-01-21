/**
 * WizardEffects
 * Visual effect overlays for wizard voice states
 * - Glow pulse (speaking state) - syncs with 12fps spritesheet
 * - Ripple rings (listening state) - concentric purple expanding rings
 * - Shimmer gradient (thinking state) - subtle sweeping highlight
 * - TV focus scale (tvos mode) - 1.08x scale + stronger glow
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Platform } from 'react-native';
import { VoiceState } from '../../stores/supportStore';
import { colors } from '../../theme';
import { isTV } from '../../utils/platform';

interface WizardEffectsProps {
  voiceState: VoiceState;
  size: number;
  isTVFocused?: boolean;
  audioLevel?: number; // 0-1 for audio-reactive effects
}

/**
 * GlowPulse - Pulsing glow effect for speaking state
 * Syncs with 12fps spritesheet rhythm (~83ms per frame)
 */
const GlowPulse: React.FC<{ size: number; intensity?: number }> = ({
  size,
  intensity = 0.5,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Pulse at 12fps rhythm (83ms per frame, 2 frames per pulse = 166ms)
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 166,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 166,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      className="absolute"
      style={{
        width: size + 40,
        height: size + 40,
        borderRadius: (size + 40) / 2,
        backgroundColor: colors.primary,
        opacity: Animated.multiply(pulseAnim, intensity),
        ...(Platform.OS === 'web'
          ? {
              filter: 'blur(20px)',
            }
          : {}),
      }}
    />
  );
};

/**
 * RippleRings - Concentric expanding rings for listening state
 */
const RippleRings: React.FC<{ size: number }> = ({ size }) => {
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const ring3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createRingAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createRingAnimation(ring1Anim, 0);
    const anim2 = createRingAnimation(ring2Anim, 500);
    const anim3 = createRingAnimation(ring3Anim, 1000);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [ring1Anim, ring2Anim, ring3Anim]);

  const renderRing = (anim: Animated.Value, key: number) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.6],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.4, 0.2, 0],
    });

    return (
      <Animated.View
        key={key}
        className="absolute border-2 bg-transparent"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: colors.primary,
          transform: [{ scale }],
          opacity,
        }}
      />
    );
  };

  return (
    <View className="absolute justify-center items-center" style={{ width: size * 2, height: size * 2 }}>
      {renderRing(ring1Anim, 1)}
      {renderRing(ring2Anim, 2)}
      {renderRing(ring3Anim, 3)}
    </View>
  );
};

/**
 * ShimmerGradient - Sweeping highlight for thinking state
 */
const ShimmerGradient: React.FC<{ size: number }> = ({ size }) => {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 2,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-size, size * 2],
  });

  return (
    <View className="absolute overflow-hidden rounded-full" style={{ width: size, height: size }}>
      <Animated.View
        className="absolute w-[30px]"
        style={{
          height: size * 1.5,
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          transform: [
            { translateX },
            { rotate: '25deg' },
          ],
          ...(Platform.OS === 'web'
            ? {
                filter: 'blur(10px)',
              }
            : {}),
        }}
      />
    </View>
  );
};

/**
 * AudioLevelIndicator - Visual audio level meter
 * Uses scaleX transform for native driver support (smoother animation)
 * Positioned at left edge so scaleX grows from left to right
 */
const AudioLevelIndicator: React.FC<{ level: number; size: number }> = ({
  level,
  size,
}) => {
  const animatedLevel = useRef(new Animated.Value(0.01)).current;
  const containerWidth = size * 0.8;

  useEffect(() => {
    Animated.spring(animatedLevel, {
      toValue: Math.max(0.01, level), // Minimum scale to prevent disappearing
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [level, animatedLevel]);

  // Use translateX to simulate left-aligned scaling
  // scaleX scales from center, so we offset by half the width * (1 - scale)
  const translateX = animatedLevel.interpolate({
    inputRange: [0, 1],
    outputRange: [-containerWidth / 2, 0],
    extrapolate: 'clamp',
  });

  return (
    <View className="h-1 bg-white/10 rounded-sm overflow-hidden" style={{ width: containerWidth }}>
      <Animated.View
        className="h-full rounded-sm"
        style={{
          width: containerWidth,
          backgroundColor: level > 0.5 ? colors.primary : colors.textSecondary,
          transform: [
            { translateX },
            { scaleX: animatedLevel },
          ],
        }}
      />
    </View>
  );
};

/**
 * WizardEffects - Combined effect overlay component
 */
export const WizardEffects: React.FC<WizardEffectsProps> = ({
  voiceState,
  size,
  isTVFocused = false,
  audioLevel = 0,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // TV focus animation
  useEffect(() => {
    if (isTV) {
      Animated.spring(scaleAnim, {
        toValue: isTVFocused ? 1.08 : 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isTVFocused, scaleAnim]);

  return (
    <Animated.View
      className="absolute items-center justify-center pointer-events-none"
      style={{
        width: size + 60,
        height: size + 60,
        transform: [{ scale: scaleAnim }],
      }}
    >
      {/* Speaking: Glow pulse synced with spritesheet */}
      {voiceState === 'speaking' && (
        <GlowPulse size={size} intensity={isTVFocused ? 0.7 : 0.5} />
      )}

      {/* Listening: Ripple rings */}
      {voiceState === 'listening' && <RippleRings size={size} />}

      {/* Processing/Thinking: Shimmer */}
      {voiceState === 'processing' && <ShimmerGradient size={size} />}

      {/* TV focus: Stronger glow overlay */}
      {isTVFocused && voiceState === 'idle' && (
        <View
          className="absolute"
          style={{
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            backgroundColor: 'rgba(168, 85, 247, 0.3)',
            ...(Platform.OS === 'web'
              ? {
                  filter: 'blur(15px)',
                }
              : {}),
          }}
        />
      )}

      {/* Audio level indicator (shown during listening) */}
      {voiceState === 'listening' && audioLevel > 0.01 && (
        <View className="absolute -bottom-5 items-center">
          <AudioLevelIndicator level={audioLevel} size={size} />
        </View>
      )}
    </Animated.View>
  );
};

export default WizardEffects;
