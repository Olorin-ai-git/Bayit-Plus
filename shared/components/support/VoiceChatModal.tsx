/**
 * Voice Chat Panel
 * Compact floating wizard character for voice interactions with Olorin
 * Closes on: tap outside, saying "Go", or starting content playback
 * Uses LLM for real conversations, activated by "Jarvis" wake word
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';

// Wizard avatar images for different states
const WIZARD_AVATARS = {
  idle: require('../../assets/images/characters/wizard/idle/256x256.png'),
  listening: require('../../assets/images/characters/wizard/listening/256x256.png'),
  speaking: require('../../assets/images/characters/wizard/speaking/256x256.png'),
  processing: require('../../assets/images/characters/wizard/thinking/256x256.png'),
  error: require('../../assets/images/characters/wizard/idle/256x256.png'),
};

interface VoiceChatModalProps {
  visible: boolean;
  onClose: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onInterrupt: () => void;
}

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  visible,
  onClose,
  onStartListening,
  onStopListening,
  onInterrupt,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const { voiceState } = useSupportStore();

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const wizardBreathing = useRef(new Animated.Value(1)).current;

  // Animate panel in/out
  useEffect(() => {
    if (visible) {
      // Pop in animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Start breathing animation
      startBreathingAnimation();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Wizard breathing animation (subtle scale pulse)
  const startBreathingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wizardBreathing, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(wizardBreathing, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Get wizard avatar based on voice state
  const getWizardAvatar = () => {
    return WIZARD_AVATARS[voiceState] || WIZARD_AVATARS.idle;
  };

  if (!visible) return null;

  // Compact sizes
  const wizardSize = isTV ? 180 : 140;

  return (
    <View style={styles.container}>
      {/* Backdrop - tap to close */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Compact Panel */}
      <Animated.View
        style={[
          styles.panel,
          isRTL ? styles.panelRTL : styles.panelLTR,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Wizard Character */}
        <Animated.View
          style={[
            styles.wizardContainer,
            { transform: [{ scale: wizardBreathing }] },
          ]}
        >
          <Image
            source={getWizardAvatar()}
            style={[styles.wizardImage, { width: wizardSize, height: wizardSize }]}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Name Badge */}
        <View style={styles.nameBadge}>
          <Text style={styles.nameText}>Olorin</Text>
          <Text style={styles.roleText}>{t('support.wizard.role', 'Your Guide')}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  panel: {
    position: 'absolute',
    bottom: isTV ? spacing.xl * 3 : spacing.xl * 2,
    backgroundColor: 'rgba(13, 13, 26, 0.95)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    } : {}),
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  panelLTR: {
    right: isTV ? spacing.xl * 2 : spacing.lg,
  },
  panelRTL: {
    left: isTV ? spacing.xl * 2 : spacing.lg,
  },
  wizardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardImage: {
    // Wizard image - no additional styling needed
  },
  nameBadge: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  nameText: {
    fontSize: isTV ? 20 : 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  roleText: {
    fontSize: isTV ? 12 : 10,
    color: colors.primary,
    fontWeight: '500',
  },
});

export default VoiceChatModal;
