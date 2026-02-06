/**
 * Voice Avatar FAB
 * Floating action button with animated wizard avatar for voice support
 * Mode-aware: visibility controlled by avatar mode setting
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Animated, Easing, Image, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore } from '../../stores/supportStore';
import { useVoiceAvatarMode } from '../../hooks/useVoiceAvatarMode';
import { useVoiceOrchestrator } from '../../hooks/useVoiceOrchestrator';
import { isTV } from '../../utils/platform';
import { voiceActivationFeedback } from '../../utils/voiceHaptics';
import { logger } from '../../utils/logger';
import { ProcessingOverlay, WakeWordPulse } from './FABAnimations';

const fabLogger = logger.scope('VoiceAvatarFAB');

const WIZARD_HAT = {
  mobile: require('../../assets/images/characters/hat/48x48.png'),
  tv: require('../../assets/images/characters/hat/64x64.png'),
};

interface VoiceAvatarFABProps {
  onPress: () => void;
  visible?: boolean;
}

export const VoiceAvatarFAB: React.FC<VoiceAvatarFABProps> = ({ onPress, visible = true }) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const { voiceState, wakeWordDetected } = useSupportStore();
  const [isFocused, setIsFocused] = useState(false);
  const platform = Platform.OS === 'web' ? 'web' : isTV ? 'tv' : 'mobile';
  const { avatarMode } = useVoiceAvatarMode(platform);
  const { isListening, startListening, stopListening } = useVoiceOrchestrator({ autoInitialize: true });

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true,
    }).start();
  }, [visible, opacityAnim]);

  useEffect(() => {
    if (!visible) return;
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -5, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, [visible, bounceAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const handlePress = () => {
    voiceActivationFeedback();
    onPress();
    if (isListening) {
      stopListening().catch((err) => fabLogger.error('Failed to stop listening via orchestrator', err));
    } else {
      startListening('manual').catch((err) => fabLogger.error('Failed to start listening via orchestrator', err));
    }
  };

  const fabSize = isTV ? 96 : 64;
  const hatSize = isTV ? 72 : 48;

  useEffect(() => {
    if (wakeWordDetected && avatarMode !== 'icon_only') onPress();
  }, [wakeWordDetected, avatarMode, onPress]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container, isRTL ? styles.containerRTL : styles.containerLTR,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }, { translateY: bounceAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}
        onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
        activeOpacity={0.9} accessible
        accessibilityLabel={t('voice.avatar.openVoice')} accessibilityRole="button"
        accessibilityHint={t('voice.avatar.openVoiceHint')}
        accessibilityState={{ busy: voiceState === 'processing', selected: wakeWordDetected }}
        style={[
          styles.fab,
          { width: fabSize, height: fabSize, borderRadius: fabSize / 2 },
          isFocused && styles.fabFocused,
        ]}
      >
        <Image
          source={isTV ? WIZARD_HAT.tv : WIZARD_HAT.mobile}
          style={{ width: hatSize, height: hatSize }}
          resizeMode="contain" accessible accessibilityLabel={t('voice.avatar.wizardHat')}
        />
        {voiceState === 'processing' && <ProcessingOverlay />}
        {wakeWordDetected && <WakeWordPulse />}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'fixed' as any,
    bottom: isTV ? spacing.xl * 2 : 24,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  containerLTR: { right: isTV ? spacing.xl * 2 : 24 } as any,
  containerRTL: { left: isTV ? spacing.xl * 2 : 24 } as any,
  fab: {
    backgroundColor: 'rgba(13, 13, 26, 0.9)',
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabFocused: { borderColor: colors.text, borderWidth: 3 },
});

export default VoiceAvatarFAB;
