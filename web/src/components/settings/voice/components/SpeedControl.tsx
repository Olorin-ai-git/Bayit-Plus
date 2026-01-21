/**
 * Speed Control Component
 * TTS speed selector with preset options
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gauge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

const TTS_SPEEDS = [0.75, 1.0, 1.25, 1.5];

interface SpeedControlProps {
  speed: number;
  isRTL: boolean;
  onSpeedChange: (speed: number) => void;
}

export function SpeedControl({ speed, isRTL, onSpeedChange }: SpeedControlProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.controlSection}>
      <View style={[styles.controlHeader, isRTL && styles.controlHeaderRTL]}>
        <Gauge size={14} color={colors.textMuted} />
        <Text style={[styles.controlLabel, isRTL && styles.textRTL]}>
          {t('profile.voice.ttsSpeed', 'Speaking Speed')}
        </Text>
        <Text style={styles.controlValue}>
          {speed.toFixed(1)}x
        </Text>
      </View>
      <View style={[styles.speedOptions, isRTL && styles.speedOptionsRTL]}>
        {TTS_SPEEDS.map((speedOption) => {
          const isSelected = Math.abs(speed - speedOption) < 0.05;
          return (
            <Pressable
              key={speedOption}
              onPress={() => onSpeedChange(speedOption)}
              style={[
                styles.speedOption,
                isSelected && styles.speedOptionSelected,
              ]}
            >
              <Text
                style={[
                  styles.speedText,
                  isSelected && styles.speedTextSelected,
                ]}
              >
                {speedOption === 1.0 ? t('common.normal', 'Normal') : `${speedOption}x`}
              </Text>
            </Pressable>
          );
        })}
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
  speedOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  speedOptionsRTL: {
    flexDirection: 'row-reverse',
  },
  speedOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  speedOptionSelected: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  speedText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  speedTextSelected: {
    color: colors.primary,
  },
});
