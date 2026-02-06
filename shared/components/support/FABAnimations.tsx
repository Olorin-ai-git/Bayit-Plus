/**
 * FAB Animation Components
 * Animated overlays for the Voice Avatar FAB button
 * ProcessingOverlay: spinning ring during voice processing
 * WakeWordPulse: expanding pulse when wake word is detected
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { colors, spacing } from '@olorin/design-tokens';
import { isTV } from '../../utils/platform';

export const ProcessingOverlay: React.FC = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotate.start();
    return () => rotate.stop();
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[styles.processingOverlay, { transform: [{ rotate: spin }] }]}
    />
  );
};

export const WakeWordPulse: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  return (
    <Animated.View
      style={[styles.wakeWordPulse, { transform: [{ scale }], opacity }]}
    />
  );
};

const styles = StyleSheet.create({
  processingOverlay: {
    position: 'absolute',
    width: isTV ? 64 : 44,
    height: isTV ? 64 : 44,
    borderRadius: isTV ? 32 : 22,
    borderWidth: 2,
    borderColor: colors.warning.DEFAULT,
    borderTopColor: 'transparent',
  },
  wakeWordPulse: {
    position: 'absolute',
    width: isTV ? 96 : 64,
    height: isTV ? 96 : 64,
    borderRadius: isTV ? 48 : 32,
    borderWidth: 2,
    borderColor: colors.info[500],
    backgroundColor: 'transparent',
  },
});
