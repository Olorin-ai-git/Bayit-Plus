/**
 * Accessibility Section Component
 * Accessibility settings including text size and contrast
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Eye, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
    <GlassView style={styles.section}>
      <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
        <Eye size={16} color={colors.textMuted} />
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
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

      <View style={styles.textSizeSection}>
        <View style={[styles.textSizeHeader, isRTL && styles.textSizeHeaderRTL]}>
          <Type size={16} color={colors.textMuted} />
          <Text style={styles.textSizeLabel}>
            {t('profile.voice.textSize', 'Text size')}
          </Text>
        </View>
        <View style={[styles.textSizeOptions, isRTL && styles.textSizeOptionsRTL]}>
          {TEXT_SIZES.map((size) => {
            const isSelected = textSize === size.value;
            return (
              <Pressable
                key={size.value}
                onPress={() => onTextSizeChange(size.value)}
                style={({ hovered }: any) => [
                  styles.textSizeOption,
                  isSelected && styles.textSizeOptionSelected,
                  hovered && styles.textSizeOptionHovered,
                ]}
              >
                <Text
                  style={[
                    styles.textSizeText,
                    isSelected && styles.textSizeTextSelected,
                    size.value === 'small' && { fontSize: 12 },
                    size.value === 'medium' && { fontSize: 14 },
                    size.value === 'large' && { fontSize: 16 },
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
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  textSizeSection: {
    paddingTop: spacing.sm,
  },
  textSizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  textSizeHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  textSizeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  textSizeOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  textSizeOptionsRTL: {
    flexDirection: 'row-reverse',
  },
  textSizeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  textSizeOptionSelected: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  textSizeOptionHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  textSizeText: {
    color: colors.text,
  },
  textSizeTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
});
