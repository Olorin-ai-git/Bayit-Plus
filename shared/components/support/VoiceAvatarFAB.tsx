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
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore, VoiceState } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';
import { supportConfig } from '../../config/supportConfig';
import { CircularWaveform } from './VoiceWaveform';

// Wizard hat image for the FAB
const WIZARD_HAT = require('../../assets/images/characters/hat/64x64.png');

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
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Visibility animation
  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacityAnim]);

  // Glow animation based on state
  useEffect(() => {
    if (voiceState === 'listening' || voiceState === 'speaking') {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      glow.start();
      return () => glow.stop();
    } else {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [voiceState, glowAnim]);

  // Idle bounce animation
  useEffect(() => {
    if (voiceState === 'idle') {
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
    } else {
      bounceAnim.setValue(0);
    }
  }, [voiceState, bounceAnim]);

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

  const getGlowColor = () => {
    switch (voiceState) {
      case 'listening':
        return colors.success;
      case 'speaking':
        return colors.primary;
      case 'processing':
        return colors.warning;
      case 'error':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const fabSize = isTV ? 80 : 64;

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
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: fabSize + 20,
            height: fabSize + 20,
            borderRadius: (fabSize + 20) / 2,
            backgroundColor: getGlowColor(),
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.4],
            }),
            transform: [
              {
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.3],
                }),
              },
            ],
          },
        ]}
      />

      {/* Circular waveform */}
      {(voiceState === 'listening' || voiceState === 'speaking') && (
        <View style={styles.waveformContainer}>
          <CircularWaveform state={voiceState} audioLevel={0.6} />
        </View>
      )}

      {/* FAB Button */}
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
        {/* Wizard Avatar */}
        <View style={styles.avatarContainer}>
          <WizardAvatar state={voiceState} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface WizardHatAvatarProps {
  state: VoiceState;
}

const WizardAvatar: React.FC<WizardHatAvatarProps> = ({ state }) => {
  const hatSize = isTV ? 56 : 44;

  // State-based tint colors for visual feedback
  const getStateTintColor = () => {
    switch (state) {
      case 'listening':
        return 'rgba(34, 197, 94, 0.3)'; // Green tint
      case 'speaking':
        return 'rgba(168, 85, 247, 0.3)'; // Purple tint
      case 'processing':
        return 'rgba(234, 179, 8, 0.3)'; // Yellow tint
      case 'error':
        return 'rgba(239, 68, 68, 0.3)'; // Red tint
      default:
        return 'transparent';
    }
  };

  return (
    <View style={styles.wizardContainer}>
      {/* State indicator glow behind hat */}
      {state !== 'idle' && (
        <View
          style={[
            styles.stateGlow,
            {
              width: hatSize + 8,
              height: hatSize + 8,
              borderRadius: (hatSize + 8) / 2,
              backgroundColor: getStateTintColor(),
            },
          ]}
        />
      )}

      {/* Wizard Hat Image */}
      <Image
        source={WIZARD_HAT}
        style={[
          styles.wizardHatImage,
          { width: hatSize, height: hatSize },
        ]}
        resizeMode="contain"
      />

      {/* Processing spinner overlay */}
      {state === 'processing' && (
        <ProcessingOverlay />
      )}

      {/* Error indicator */}
      {state === 'error' && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorX} />
        </View>
      )}
    </View>
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
  glow: {
    position: 'absolute',
  },
  waveformContainer: {
    position: 'absolute',
  },
  fab: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  avatarContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wizardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateGlow: {
    position: 'absolute',
  },
  wizardHatImage: {
    // Hat image doesn't need border radius - it has transparent background
  },
  processingOverlay: {
    position: 'absolute',
    width: isTV ? 40 : 32,
    height: isTV ? 40 : 32,
    borderRadius: isTV ? 20 : 16,
    borderWidth: 2,
    borderColor: colors.warning,
    borderTopColor: 'transparent',
  },
  errorOverlay: {
    position: 'absolute',
    width: isTV ? 24 : 18,
    height: isTV ? 24 : 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorX: {
    width: isTV ? 20 : 14,
    height: 3,
    backgroundColor: colors.error,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
});

export default VoiceAvatarFAB;
