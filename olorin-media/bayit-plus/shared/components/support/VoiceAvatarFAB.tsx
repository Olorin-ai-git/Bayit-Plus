/**
 * Voice Avatar FAB
 * Floating action button with animated wizard avatar for voice support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';

// Wizard hat images for FAB button
const WIZARD_HAT = {
  mobile: require('../../assets/images/characters/hat/48x48.png'),
  tv: require('../../assets/images/characters/hat/64x64.png'),
};

interface VoiceAvatarFABProps {
  onPress: () => void;
  visible?: boolean;
}

export const VoiceAvatarFAB: React.FC<VoiceAvatarFABProps> = ({
  onPress,
  visible = true,
}) => {
  const { isRTL } = useDirection();
  const { voiceState } = useSupportStore();
  const [isFocused, setIsFocused] = useState(false);

  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Visibility animation
  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacityAnim]);

  // Idle floating animation
  useEffect(() => {
    if (!visible) return;

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -5,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, [visible, bounceAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Sizes: TV gets bigger FAB and hat
  const fabSize = isTV ? 96 : 64;
  const hatSize = isTV ? 72 : 48;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        isRTL ? styles.containerRTL : styles.containerLTR,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: bounceAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        activeOpacity={0.9}
        style={[
          styles.fab,
          {
            width: fabSize,
            height: fabSize,
            borderRadius: fabSize / 2,
          },
          isFocused && styles.fabFocused,
        ]}
      >
        <Image
          source={isTV ? WIZARD_HAT.tv : WIZARD_HAT.mobile}
          style={[
            styles.wizardHat,
            { width: hatSize, height: hatSize },
          ]}
          resizeMode="contain"
        />

        {voiceState === 'processing' && <ProcessingOverlay />}
      </TouchableOpacity>
    </Animated.View>
  );
};

const ProcessingOverlay: React.FC = () => {
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
      style={[
        styles.processingOverlay,
        { transform: [{ rotate: spin }] },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: isTV ? spacing.xl * 2 : spacing.xl,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerLTR: {
    right: isTV ? spacing.xl * 2 : spacing.lg,
  },
  containerRTL: {
    left: isTV ? spacing.xl * 2 : spacing.lg,
  },
  fab: {
    backgroundColor: 'rgba(13, 13, 26, 0.9)',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabFocused: {
    borderColor: colors.text,
    borderWidth: 3,
  },
  wizardHat: {
    // Wizard hat image
  },
  processingOverlay: {
    position: 'absolute',
    width: isTV ? 64 : 44,
    height: isTV ? 64 : 44,
    borderRadius: isTV ? 32 : 22,
    borderWidth: 2,
    borderColor: colors.warning,
    borderTopColor: 'transparent',
  },
});

export default VoiceAvatarFAB;
