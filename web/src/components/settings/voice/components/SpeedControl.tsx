/**
 * Speed Control Component
 * TTS speed selector with preset options
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gauge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

const TTS_SPEEDS = [0.75, 1.0, 1.25, 1.5];

interface SpeedControlProps {
  speed: number;
  isRTL: boolean;
  onSpeedChange: (speed: number) => void;
}

export function SpeedControl({ speed, isRTL, onSpeedChange }: SpeedControlProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Gauge size={14} color={colors.textMuted} />
        <Text style={[styles.label, isRTL && styles.rtlText]}>
          {t('profile.voice.ttsSpeed', 'Speaking Speed')}
        </Text>
        <Text style={styles.value}>
          {speed.toFixed(1)}x
        </Text>
      </View>
      <View style={[styles.speedRow, isRTL && styles.rtlRow]}>
        {TTS_SPEEDS.map((speedOption) => {
          const isSelected = Math.abs(speed - speedOption) < 0.05;
          return (
            <Pressable
              key={speedOption}
              onPress={() => onSpeedChange(speedOption)}
              style={[
                styles.speedButton,
                isSelected ? styles.speedSelected : styles.speedUnselected
              ]}
            >
              <Text
                style={[isSelected ? styles.speedTextSelected : styles.speedTextUnselected]}
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
  container: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
  },
  rtlText: {
    textAlign: 'right',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A855F7',
  },
  speedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  speedButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 4,
  },
  speedSelected: {
    backgroundColor: 'rgba(126, 34, 206, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.4)',
  },
  speedUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  speedTextSelected: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a855f7',
  },
  speedTextUnselected: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
});
