/**
 * Voice Avatar FAB
 * Floating action button with animated wizard avatar for voice support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
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
      className={`absolute ${isTV ? 'bottom-24' : 'bottom-16'} ${isRTL ? (isTV ? 'left-24' : 'left-4') : (isTV ? 'right-24' : 'right-4')} z-[1000] items-center justify-center`}
      style={{
        opacity: opacityAnim,
        transform: [
          { scale: scaleAnim },
          { translateY: bounceAnim },
        ],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        activeOpacity={0.9}
        className={`bg-[#0d0d1a]/90 ${isFocused ? 'border-white border-[3px]' : 'border-purple-500 border-2'} justify-center items-center shadow-lg`}
        style={{
          width: fabSize,
          height: fabSize,
          borderRadius: fabSize / 2,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Image
          source={isTV ? WIZARD_HAT.tv : WIZARD_HAT.mobile}
          style={{ width: hatSize, height: hatSize }}
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
      className={`absolute ${isTV ? 'w-16 h-16 rounded-[32px]' : 'w-11 h-11 rounded-[22px]'} border-2 border-yellow-500 border-t-transparent`}
      style={{ transform: [{ rotate: spin }] }}
    />
  );
};

export default VoiceAvatarFAB;
