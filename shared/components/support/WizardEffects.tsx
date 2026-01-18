/**
 * WizardEffects
 * Visual effect overlays for wizard voice states
 * - Glow pulse (speaking state) - syncs with 12fps spritesheet
 * - Ripple rings (listening state) - concentric purple expanding rings
 * - Shimmer gradient (thinking state) - subtle sweeping highlight
 * - TV focus scale (tvos mode) - 1.08x scale + stronger glow
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
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
      style={[
        styles.glowBase,
        {
          width: size + 40,
          height: size + 40,
          borderRadius: (size + 40) / 2,
          opacity: Animated.multiply(pulseAnim, intensity),
        },
      ]}
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
        style={[
          styles.rippleRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <View style={[styles.rippleContainer, { width: size * 2, height: size * 2 }]}>
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
    <View style={[styles.shimmerContainer, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.shimmerHighlight,
          {
            height: size * 1.5,
            transform: [
              { translateX },
              { rotate: '25deg' },
            ],
          },
        ]}
      />
    </View>
  );
};

/**
 * AudioLevelIndicator - Visual audio level meter
 */
const AudioLevelIndicator: React.FC<{ level: number; size: number }> = ({
  level,
  size,
}) => {
  const animatedLevel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedLevel, {
      toValue: level,
      duration: 50, // Fast response
      useNativeDriver: false,
    }).start();
  }, [level, animatedLevel]);

  const barWidth = animatedLevel.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.audioLevelContainer, { width: size * 0.8 }]}>
      <Animated.View
        style={[
          styles.audioLevelBar,
          {
            width: barWidth,
            backgroundColor: level > 0.5 ? colors.primary : colors.textSecondary,
          },
        ]}
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
      style={[
        styles.effectsContainer,
        {
          width: size + 60,
          height: size + 60,
          transform: [{ scale: scaleAnim }],
        },
      ]}
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
          style={[
            styles.tvFocusGlow,
            {
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) / 2,
            },
          ]}
        />
      )}

      {/* Audio level indicator (shown during listening) */}
      {voiceState === 'listening' && audioLevel > 0.01 && (
        <View style={styles.audioIndicatorWrapper}>
          <AudioLevelIndicator level={audioLevel} size={size} />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  effectsContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  glowBase: {
    position: 'absolute',
    backgroundColor: colors.primary,
    ...(Platform.OS === 'web'
      ? {
          filter: 'blur(20px)',
        }
      : {}),
  },
  rippleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  shimmerContainer: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 999,
  },
  shimmerHighlight: {
    position: 'absolute',
    width: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    ...(Platform.OS === 'web'
      ? {
          filter: 'blur(10px)',
        }
      : {}),
  },
  tvFocusGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    ...(Platform.OS === 'web'
      ? {
          filter: 'blur(15px)',
        }
      : {}),
  },
  audioIndicatorWrapper: {
    position: 'absolute',
    bottom: -20,
    alignItems: 'center',
  },
  audioLevelContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioLevelBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default WizardEffects;
