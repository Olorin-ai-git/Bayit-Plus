/**
 * Accessibility Section Component
 * Accessibility settings including text size and contrast
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Eye, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared/ui';
import { VoiceSettingRow } from './VoiceSettingRow';
import { TextSize } from '../types';

const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

interface AccessibilitySectionProps {
  autoSubtitle: boolean;
  highContrastMode: boolean;
  textSize: TextSize;
  isRTL: boolean;
  onToggleAutoSubtitle: () => void;
  onToggleHighContrast: () => void;
  onTextSizeChange: (size: TextSize) => void;
}

export function AccessibilitySection({
  autoSubtitle,
  highContrastMode,
  textSize,
  isRTL,
  onToggleAutoSubtitle,
  onToggleHighContrast,
  onTextSizeChange,
}: AccessibilitySectionProps) {
  const { t } = useTranslation();

  return (
    <GlassView style={styles.container}>
      <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
        <Eye size={16} color="#9CA3AF" />
        <Text style={styles.sectionTitle}>
          {t('profile.voice.accessibility', 'Accessibility')}
        </Text>
      </View>

      <VoiceSettingRow
        label={t('profile.voice.autoSubtitle', 'Auto-enable subtitles')}
        description={t('profile.voice.autoSubtitleDesc', 'Automatically show subtitles when playing content')}
        value={autoSubtitle}
        onToggle={onToggleAutoSubtitle}
        isRTL={isRTL}
      />

      <VoiceSettingRow
        label={t('profile.voice.highContrast', 'High contrast mode')}
        description={t('profile.voice.highContrastDesc', 'Increase contrast for better visibility')}
        value={highContrastMode}
        onToggle={onToggleHighContrast}
        isRTL={isRTL}
      />

      <View style={styles.textSizeContainer}>
        <View style={[styles.textSizeHeader, isRTL && styles.rowReverse]}>
          <Type size={16} color="#9CA3AF" />
          <Text style={styles.textSizeTitle}>
            {t('profile.voice.textSize', 'Text size')}
          </Text>
        </View>
        <View style={[styles.textSizeRow, isRTL && styles.rowReverse]}>
          {TEXT_SIZES.map((size) => {
            const isSelected = textSize === size.value;
            return (
              <Pressable
                key={size.value}
                onPress={() => onTextSizeChange(size.value)}
                style={[
                  styles.textSizeButton,
                  isSelected ? styles.textSizeButtonSelected : styles.textSizeButtonUnselected,
                ]}
              >
                <Text
                  style={[
                    styles.textSizeLabel,
                    isSelected && styles.textSizeLabelSelected,
                    {
                      fontSize: size.value === 'small' ? 12 : size.value === 'medium' ? 14 : 16
                    }
                  ]}
                >
                  {t(`profile.voice.textSize${size.label}`, size.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 0,
  },
  textSizeContainer: {
    paddingTop: 8,
  },
  textSizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  textSizeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  textSizeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textSizeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  textSizeButtonSelected: {
    backgroundColor: 'rgba(88, 28, 135, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  textSizeButtonUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  textSizeLabel: {
    color: '#ffffff',
  },
  textSizeLabelSelected: {
    color: '#a855f7',
    fontWeight: '500',
  },
});
