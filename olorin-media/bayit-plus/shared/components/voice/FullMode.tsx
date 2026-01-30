/**
 * Full Mode Component
 * Full-screen wizard with animations, transcript, and full voice interaction
 * Complete immersive voice experience
 */

import React from 'react';
import { View, Text, TouchableWithoutFeedback, Animated, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';
import { VoiceState, GestureState } from '../../stores/supportStore';
import { WizardSprite } from '../support/WizardSprite';
import { WizardEffects } from '../support/WizardEffects';
import { getStateColor } from '../../utils/voiceVisualizers';
import {
  WIZARD_AVATARS,
  GESTURE_AVATARS,
  ANIMATED_GESTURES,
  GESTURE_TO_SPRITESHEET,
} from '../../constants/wizardAvatars';

interface FullModeProps {
  visible: boolean;
  voiceState: VoiceState;
  gestureState: GestureState | null;
  isAnimatingGesture: boolean;
  currentTranscript: string;
  lastResponse: string;
  audioLevel: number;
  showAnimations: boolean;
  showTranscript: boolean;
  onClose: () => void;
  scaleAnim: Animated.Value;
  opacityAnim: Animated.Value;
  dimensions: { width: number; height: number };
}

export const FullMode: React.FC<FullModeProps> = ({
  visible,
  voiceState,
  gestureState,
  isAnimatingGesture,
  currentTranscript,
  lastResponse,
  audioLevel,
  showAnimations,
  showTranscript,
  onClose,
  scaleAnim,
  opacityAnim,
  dimensions,
}) => {
  const { t } = useTranslation();

  const useSprite =
    showAnimations && gestureState && ANIMATED_GESTURES.has(gestureState) && isAnimatingGesture;

  const spriteType = gestureState ? GESTURE_TO_SPRITESHEET[gestureState] : undefined;

  const avatarSource = gestureState ? GESTURE_AVATARS[gestureState] : WIZARD_AVATARS[voiceState];

  return (
    <TouchableWithoutFeedback
      onPress={onClose}
      accessible
      accessibilityLabel={t('voice.avatar.fullMode')}
      accessibilityRole="button"
      accessibilityHint={t('voice.avatar.closePanelHint')}
    >
      <View style={styles.fullOverlay}>
        <Animated.View
          style={[
            styles.fullPanel,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
          accessible
          accessibilityLabel={t('voice.avatar.wizardInteraction')}
          accessibilityRole="main"
          accessibilityState={{ busy: voiceState === 'processing' }}
        >
          {/* Wizard avatar */}
          <View
            style={[styles.fullWizard, { width: dimensions.width, height: dimensions.height }]}
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

          {/* Transcript area */}
          {showTranscript && (
            <View
              style={styles.fullTranscript}
              accessible
              accessibilityLabel={t('voice.avatar.transcript')}
              accessibilityRole="text"
            >
              {currentTranscript && (
                <Text
                  style={styles.transcriptText}
                  accessible
                  accessibilityLabel={currentTranscript}
                  accessibilityRole="text"
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                >
                  {currentTranscript}
                </Text>
              )}
              {lastResponse && voiceState === 'speaking' && (
                <Text
                  style={styles.responseText}
                  accessible
                  accessibilityLabel={lastResponse}
                  accessibilityRole="text"
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                >
                  {lastResponse}
                </Text>
              )}
            </View>
          )}

          {/* State indicator */}
          <View
            style={styles.fullStateIndicator}
            accessible
            accessibilityLabel={t(`voice.state.${voiceState}`)}
          >
            <View
              style={[styles.stateIcon, { backgroundColor: getStateColor(voiceState) }]}
              accessible
              accessibilityLabel={t(`voice.state.${voiceState}`)}
            />
            <Text
              style={styles.stateLabel}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              {t(`voice.state.${voiceState}`)}
            </Text>
          </View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  fullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.glass.bgMedium,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  fullPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  fullWizard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullTranscript: {
    maxWidth: 600,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  transcriptText: {
    color: colors.white,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
  responseText: {
    color: colors.gray[300],
    fontSize: 16,
    textAlign: 'center',
  },
  fullStateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stateIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stateLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FullMode;
