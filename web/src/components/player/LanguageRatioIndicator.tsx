/**
 * LanguageRatioIndicator
 * Visual horizontal bar showing Hebrew vs English percentage ratio
 * with animated transitions and optional compact mode
 */

import { useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

interface LanguageRatioIndicatorProps {
  hebrewRatio: number;
  compact?: boolean;
}

export function LanguageRatioIndicator({
  hebrewRatio,
  compact = false,
}: LanguageRatioIndicatorProps) {
  const { t } = useTranslation();

  const hebrewPercent = useMemo(
    () => Math.round(Math.min(Math.max(hebrewRatio, 0), 1) * 100),
    [hebrewRatio],
  );
  const englishPercent = 100 - hebrewPercent;

  const barHeight = compact ? 6 : 10;
  const barWidth = compact ? 80 : 160;

  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessibilityRole="progressbar"
      accessibilityLabel={t('bilingual.ratio.label', 'Language ratio')}
      accessibilityValue={{
        text: `${t('bilingual.ratio.hebrew', 'Hebrew')} ${hebrewPercent}%, ${t('bilingual.ratio.english', 'English')} ${englishPercent}%`,
      }}
    >
      <View style={[styles.barTrack, { height: barHeight, width: barWidth }]}>
        <Animated.View
          style={[
            styles.barFillHebrew,
            { width: `${hebrewPercent}%`, height: barHeight },
          ]}
        />
        <View
          style={[
            styles.barFillEnglish,
            { width: `${englishPercent}%`, height: barHeight },
          ]}
        />
      </View>

      <Text style={[styles.labelText, compact && styles.labelTextCompact]}>
        {t('bilingual.ratio.hebrew', 'Hebrew')} {hebrewPercent}%
        {' | '}
        {t('bilingual.ratio.english', 'English')} {englishPercent}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  containerCompact: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  barTrack: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  barFillHebrew: {
    backgroundColor: '#3B82F6',
    borderTopLeftRadius: borderRadius.full,
    borderBottomLeftRadius: borderRadius.full,
  },
  barFillEnglish: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderTopRightRadius: borderRadius.full,
    borderBottomRightRadius: borderRadius.full,
  },
  labelText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  labelTextCompact: {
    fontSize: 10,
  },
});
