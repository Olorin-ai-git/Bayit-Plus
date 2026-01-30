/**
 * Compact Mode Component
 * Floating circular wizard panel with animations
 * Compact voice mode for multitasking
 */

import React from 'react';
import { View, TouchableWithoutFeedback, Animated, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@olorin/design-tokens';
import { VoiceState, GestureState } from '../../stores/supportStore';
import { WizardSprite } from '../support/WizardSprite';
import { WizardEffects } from '../support/WizardEffects';
import {
  WIZARD_AVATARS,
  GESTURE_AVATARS,
  ANIMATED_GESTURES,
  GESTURE_TO_SPRITESHEET,
} from '../../constants/wizardAvatars';

interface CompactModeProps {
  visible: boolean;
  voiceState: VoiceState;
  gestureState: GestureState | null;
  isAnimatingGesture: boolean;
  showAnimations: boolean;
  onClose: () => void;
  scaleAnim: Animated.Value;
  opacityAnim: Animated.Value;
  dimensions: { width: number; height: number };
}

export const CompactMode: React.FC<CompactModeProps> = ({
  visible,
  voiceState,
  gestureState,
  isAnimatingGesture,
  showAnimations,
  onClose,
  scaleAnim,
  opacityAnim,
  dimensions,
}) => {
  const { t } = useTranslation();

  // Use spritesheet if gesture is animated
  const useSprite =
    showAnimations && gestureState && ANIMATED_GESTURES.has(gestureState) && isAnimatingGesture;

  const spriteType = gestureState ? GESTURE_TO_SPRITESHEET[gestureState] : undefined;

  // Select avatar image
  const avatarSource = gestureState ? GESTURE_AVATARS[gestureState] : WIZARD_AVATARS[voiceState];

  return (
    <TouchableWithoutFeedback
      onPress={onClose}
      accessible
      accessibilityLabel={t('voice.avatar.compactMode')}
      accessibilityRole="button"
      accessibilityHint={t('voice.avatar.closePanelHint')}
    >
      <View style={styles.compactOverlay}>
        <Animated.View
          style={[
            styles.compactPanel,
            {
              width: dimensions.width + 80,
              height: dimensions.height + 80,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
          accessible
          accessibilityLabel={t('voice.avatar.wizardAvatar')}
          accessibilityRole="image"
          accessibilityState={{ busy: voiceState === 'processing' }}
        >
          {/* Wizard avatar */}
          <View
            style={[styles.compactWizard, { width: dimensions.width, height: dimensions.height }]}
            accessible
            accessibilityLabel={
              gestureState
                ? t(`voice.gesture.${gestureState}`)
                : t(`voice.state.${voiceState}`)
            }
          >
            {useSprite && spriteType ? (
              <WizardSprite type={spriteType} size={dimensions.width} loop />
            ) : (
              <Image
                source={avatarSource}
                style={{ width: dimensions.width, height: dimensions.height }}
                accessible
                accessibilityLabel={t('voice.avatar.wizardCharacter')}
              />
            )}
          </View>

          {/* Effects */}
          <WizardEffects voiceState={voiceState} size={dimensions.width} />
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  compactOverlay: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  compactPanel: {
    backgroundColor: colors.glass.bgLight,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  compactWizard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CompactMode;
