/**
 * Season Selector Component
 * Displays season selection pills
 */

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@bayit/shared/theme';
import { GlassButton } from '@bayit/shared/ui';
import type { Season } from '../types/series.types';

interface SeasonSelectorProps {
  seasons: Season[];
  selectedSeason: number;
  onSeasonChange: (seasonNumber: number) => void;
  flexDirection: 'row' | 'row-reverse';
}

export function SeasonSelector({
  seasons,
  selectedSeason,
  onSeasonChange,
  flexDirection,
}: SeasonSelectorProps) {
  const { t } = useTranslation();

  if (seasons.length <= 1) {
    return null;
  }

  return (
    <View style={styles.seasonSelector}>
      <Text style={styles.sectionTitle}>{t('content.selectSeason')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.seasonPills, { flexDirection }]}>
          {seasons.map((season) => (
            <GlassButton
              key={season.season_number}
              onPress={() => onSeasonChange(season.season_number)}
              variant={selectedSeason === season.season_number ? 'primary' : 'ghost'}
              size="md"
              title={`${t('content.season')} ${season.season_number}`}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  seasonSelector: {
    paddingHorizontal: 48,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  seasonPills: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
