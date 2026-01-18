/**
 * Volume Control Component
 * TTS volume slider with increment/decrement buttons
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Volume2, Plus, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

interface VolumeControlProps {
  volume: number;
  isRTL: boolean;
  onVolumeChange: (volume: number) => void;
}

export function VolumeControl({ volume, isRTL, onVolumeChange }: VolumeControlProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.controlSection}>
      <View style={[styles.controlHeader, isRTL && styles.controlHeaderRTL]}>
        <Volume2 size={14} color={colors.textMuted} />
        <Text style={[styles.controlLabel, isRTL && styles.textRTL]}>
          {t('profile.voice.ttsVolume', 'Voice Volume')}
        </Text>
        <Text style={styles.controlValue}>
          {Math.round(volume * 100)}%
        </Text>
      </View>
      <View style={[styles.volumeControls, isRTL && styles.volumeControlsRTL]}>
        <Pressable
          onPress={() => onVolumeChange(Math.max(0, volume - 0.1))}
          style={styles.volumeButton}
        >
          <Minus size={14} color={colors.text} />
        </Pressable>
        <View style={styles.sliderContainer}>
          <View
            style={[
              styles.slider,
              { width: `${volume * 100}%` },
            ]}
          />
        </View>
        <Pressable
          onPress={() => onVolumeChange(Math.min(1, volume + 0.1))}
          style={styles.volumeButton}
        >
          <Plus size={14} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlSection: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: spacing.md,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  controlHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  controlLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  controlValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  textRTL: {
    textAlign: 'right',
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  volumeControlsRTL: {
    flexDirection: 'row-reverse',
  },
  volumeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderContainer: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  slider: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
