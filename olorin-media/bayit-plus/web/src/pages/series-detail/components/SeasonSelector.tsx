/**
 * Season Selector Component
 * Displays season selection pills
 */

import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
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
    <View className="px-12 py-6">
      <Text className="text-lg font-semibold text-white mb-4">{t('content.selectSeason')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className={`gap-4 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : 'flex-row'}`}>
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
