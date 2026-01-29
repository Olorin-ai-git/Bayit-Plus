/**
 * Minimal Mode Component
 * Waveform bar with status indicator only
 * Minimal distraction voice mode
 */

import React from 'react';
import { View, Text, TouchableWithoutFeedback, Animated, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { VoiceState } from '../../stores/supportStore';
import {
  WaveformVisualizer,
  ProcessingIndicator,
  SpeakingIndicator,
  getStateColor,
} from '../../utils/voiceVisualizers';

interface MinimalModeProps {
  visible: boolean;
  voiceState: VoiceState;
  audioLevel: number;
  onClose: () => void;
  scaleAnim: Animated.Value;
  opacityAnim: Animated.Value;
}

export const MinimalMode: React.FC<MinimalModeProps> = ({
  visible,
  voiceState,
  audioLevel,
  onClose,
  scaleAnim,
  opacityAnim,
}) => {
  const { t } = useTranslation();

  return (
    <TouchableWithoutFeedback
      onPress={onClose}
      accessible
      accessibilityLabel={t('voice.avatar.closePanel')}
      accessibilityRole="button"
      accessibilityHint={t('voice.avatar.closePanelHint')}
    >
      <View style={styles.minimalOverlay}>
        <Animated.View
          style={[
            styles.minimalBar,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
          accessible
          accessibilityLabel={t(`voice.state.${voiceState}`)}
          accessibilityRole="progressbar"
        >
          {/* Status indicator */}
          <View
            style={[styles.minimalStatus, { backgroundColor: getStateColor(voiceState) }]}
            accessible
            accessibilityLabel={t(`voice.state.${voiceState}`)}
          />

          {/* Waveform visualization */}
          <View
            style={styles.minimalWaveform}
            accessible
            accessibilityLabel={t('voice.avatar.audioVisualization')}
          >
            {voiceState === 'listening' && (
              <WaveformVisualizer audioLevel={audioLevel} compact />
            )}
            {voiceState === 'processing' && <ProcessingIndicator compact />}
            {voiceState === 'speaking' && <SpeakingIndicator compact />}
          </View>

          {/* State label */}
          <Text
            style={styles.minimalLabel}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            {t(`voice.state.${voiceState}`)}
          </Text>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  minimalOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  minimalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  minimalStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  minimalWaveform: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  minimalLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MinimalMode;
