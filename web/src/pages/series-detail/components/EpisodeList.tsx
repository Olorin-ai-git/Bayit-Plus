/**
 * Episode List Component
 * Displays list of episodes for selected season
 */

import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EpisodeCard } from './EpisodeCard';
import type { Episode } from '../types/series.types';

interface EpisodeListProps {
  episodes: Episode[];
  selectedSeason: number;
  selectedEpisode: Episode | null;
  episodesLoading: boolean;
  flexDirection: 'row' | 'row-reverse';
  onEpisodeSelect: (episode: Episode) => void;
  onEpisodePlay: (episode: Episode) => void;
}

export function EpisodeList({
  episodes,
  selectedSeason,
  selectedEpisode,
  episodesLoading,
  flexDirection,
  onEpisodeSelect,
  onEpisodePlay,
}: EpisodeListProps) {
  const { t } = useTranslation();

  return (
    <View className="px-12 py-6">
      {episodes.length > 0 && (
        <Text className="text-lg font-semibold text-white mb-4">
          {t('content.season')} {selectedSeason} • {episodes.length} {t('content.episodes')}
        </Text>
      )}

      {episodesLoading ? (
        <Text className="text-white/70 text-base">{t('common.loading')}</Text>
      ) : episodes.length > 0 ? (
        <View className="gap-4">
          {episodes.map((episode) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              isSelected={selectedEpisode?.id === episode.id}
              onSelect={() => onEpisodeSelect(episode)}
              onPlay={() => onEpisodePlay(episode)}
              flexDirection={flexDirection}
            />
          ))}
        </View>
      ) : (
        <View className="p-8 items-center justify-center">
          <Text className="text-base text-white/70">{t('content.noEpisodes')}</Text>
        </View>
      )}
    </View>
  );
}
