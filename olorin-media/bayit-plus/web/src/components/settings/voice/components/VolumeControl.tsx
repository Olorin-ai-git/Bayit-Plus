/**
 * Volume Control Component
 * TTS volume slider with increment/decrement buttons
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Volume2, Plus, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VolumeControlProps {
  volume: number;
  isRTL: boolean;
  onVolumeChange: (volume: number) => void;
}

export function VolumeControl({ volume, isRTL, onVolumeChange }: VolumeControlProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <Volume2 size={14} color="#9CA3AF" />
        <Text style={[styles.label, isRTL && styles.textRight]}>
          {t('profile.voice.ttsVolume', 'Voice Volume')}
        </Text>
        <Text style={styles.percentage}>
          {Math.round(volume * 100)}%
        </Text>
      </View>
      <View style={[styles.sliderRow, isRTL && styles.rowReverse]}>
        <Pressable
          onPress={() => onVolumeChange(Math.max(0, volume - 0.1))}
          style={styles.button}
        >
          <Minus size={14} color="#ffffff" />
        </Pressable>
        <View style={styles.sliderTrack}>
          <View
            style={[styles.sliderFill, { width: `${volume * 100}%` }]}
          />
        </View>
        <Pressable
          onPress={() => onVolumeChange(Math.min(1, volume + 0.1))}
          style={styles.button}
        >
          <Plus size={14} color="#ffffff" />
        </Pressable>
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
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
  },
  textRight: {
    textAlign: 'right',
  },
  percentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A855F7',
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 2,
  },
});
