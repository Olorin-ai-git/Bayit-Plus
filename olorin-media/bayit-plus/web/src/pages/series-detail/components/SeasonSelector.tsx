/**
 * Season Selector Component
 * Displays season selection pills
 */

import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/shared/ui';
import { colors } from '@olorin/design-tokens';
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
    <View style={styles.container}>
      <Text style={styles.title}>{t('content.selectSeason')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.seasonsRow, { flexDirection }]}>
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
  container: {
    paddingHorizontal: 48,
    paddingVertical: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  seasonsRow: {
    gap: 16,
  },
});
