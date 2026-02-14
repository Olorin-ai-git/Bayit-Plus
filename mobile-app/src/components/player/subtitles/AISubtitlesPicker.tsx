/**
 * AISubtitlesPicker - AI-generated subtitle mode selector
 *
 * Allows toggling between standard and AI-generated subtitles
 * with visual indicators for each mode.
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius } from '@olorin/design-tokens';
import type { SubtitleMode } from '../../../hooks/useSubtitleMode';
import { logger } from '../../../utils/logger';
import Colors from '../../../theme/colors';

const log = logger.scope('AISubtitlesPicker');

interface AISubtitlesPickerProps {
  contentId: string;
  onSelect: (mode: SubtitleMode) => void;
  selectedMode: SubtitleMode;
}

interface ModeOption {
  mode: SubtitleMode;
  icon: string;
  labelKey: string;
  descriptionKey: string;
}

const SUBTITLE_MODES: ModeOption[] = [
  {
    mode: 'standard',
    icon: 'subtitles',
    labelKey: 'subtitles.modes.standard',
    descriptionKey: 'subtitles.modes.standardDesc',
  },
  {
    mode: 'ai',
    icon: 'sparkles',
    labelKey: 'subtitles.modes.ai',
    descriptionKey: 'subtitles.modes.aiDesc',
  },
  {
    mode: 'split',
    icon: 'columns',
    labelKey: 'subtitles.modes.split',
    descriptionKey: 'subtitles.modes.splitDesc',
  },
  {
    mode: 'interactive',
    icon: 'hand',
    labelKey: 'subtitles.modes.interactive',
    descriptionKey: 'subtitles.modes.interactiveDesc',
  },
];

export const AISubtitlesPicker: React.FC<AISubtitlesPickerProps> = ({
  contentId,
  onSelect,
  selectedMode,
}) => {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (mode: SubtitleMode) => {
      onSelect(mode);
      log.info('Subtitle mode selected', { contentId, mode });
    },
    [contentId, onSelect],
  );

  return (
    <GlassView intensity="medium" style={styles.container}>
      <Text style={styles.title}>{t('subtitles.picker.title')}</Text>

      <View style={styles.modeList}>
        {SUBTITLE_MODES.map((option) => {
          const isSelected = selectedMode === option.mode;
          return (
            <Pressable
              key={option.mode}
              style={[styles.modeItem, isSelected && styles.modeItemSelected]}
              onPress={() => handleSelect(option.mode)}
              accessibilityLabel={t(option.labelKey)}
              accessibilityHint={t(option.descriptionKey)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.modeIconContainer}>
                <NativeIcon
                  name={option.icon}
                  size="md"
                  color={isSelected ? Colors.Primary.p400 : Colors.Text.muted}
                />
              </View>
              <View style={styles.modeTextContainer}>
                <Text
                  style={[
                    styles.modeLabel,
                    isSelected && styles.modeLabelSelected,
                  ]}
                >
                  {t(option.labelKey)}
                </Text>
                <Text style={styles.modeDescription}>
                  {t(option.descriptionKey)}
                </Text>
              </View>
              {isSelected && (
                <NativeIcon
                  name="check-circle"
                  size="sm"
                  color={Colors.Primary.p400}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: spacing.md,
  },
  modeList: {
    gap: spacing.xs,
  },
  modeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
    backgroundColor: Colors.Glass.whiteSubtle,
    gap: spacing.sm,
  },
  modeItemSelected: {
    borderColor: Colors.Primary.p600,
    backgroundColor: Colors.Glass.purpleLight,
  },
  modeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: Colors.Glass.whiteLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTextContainer: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
  modeLabelSelected: {
    color: Colors.Primary.p400,
  },
  modeDescription: {
    fontSize: 12,
    color: Colors.Text.muted,
    marginTop: 2,
  },
});
